const form = document.querySelector("#book-form");
const titleInput = document.querySelector("#title");
const authorInput = document.querySelector("#author");
const thoughtsInput = document.querySelector("#thoughts");
const favoriteInput = document.querySelector("#favorite");
const editIdInput = document.querySelector("#edit-id");
const saveButton = document.querySelector("#save-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const ratingLabel = document.querySelector("#rating-label");
const stars = [...document.querySelectorAll(".star")];
const bookList = document.querySelector("#book-list");
const emptyState = document.querySelector("#empty-state");
const bookCount = document.querySelector("#book-count");
const searchInput = document.querySelector("#search");

let currentRating = 0;
let books = [];

async function loadBooks() {
  const { data, error } = await supabaseClient.from("books").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("Kunne ikke hente bøger:", error);
    emptyState.hidden = false;
    emptyState.textContent = "Kunne ikke hente læseloggen. Prøv at genindlæse siden.";
    return;
  }

  books = data.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author || "",
    rating: book.rating,
    thoughts: book.thoughts || "",
    favorite: book.favorite || "",
    createdAt: book.created_at,
    updatedAt: book.updated_at,
  }));

  renderBooks();
}

async function saveBook(book, existingId) {
  const databaseBook = {
    title: book.title,
    author: book.author,
    rating: book.rating,
    thoughts: book.thoughts,
    favorite: book.favorite,
    updated_at: new Date().toISOString(),
  };

  let result;

  if (existingId) {
    result = await supabaseClient.from("books").update(databaseBook).eq("id", existingId);
  } else {
    result = await supabaseClient.from("books").insert([databaseBook]);
  }

  if (result.error) {
    console.error("Kunne ikke gemme bog:", result.error);
    alert("Bogen kunne ikke gemmes. Tjek forbindelsen til databasen.");
    return false;
  }

  await loadBooks();
  return true;
}

async function setRating(rating) {
  currentRating = rating;

  stars.forEach((star) => {
    const active = Number(star.dataset.rating) <= rating;
    star.classList.toggle("active", active);
    star.setAttribute("aria-pressed", String(Number(star.dataset.rating) === rating));
  });

  ratingLabel.textContent = rating ? `${rating} ud af 5 stjerner` : "Vælg 1–5 stjerner";
}

stars.forEach((star) => {
  star.addEventListener("click", () => {
    setRating(Number(star.dataset.rating));
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentRating) {
    ratingLabel.textContent = "Vælg gerne en rating først";
    document.querySelector(".rating-field").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    return;
  }

  const existingId = editIdInput.value;
  const previousBook = books.find((book) => book.id === existingId);

  const book = {
    title: titleInput.value.trim(),
    author: authorInput.value.trim(),
    rating: currentRating,
    thoughts: thoughtsInput.value.trim(),
    favorite: favoriteInput.value.trim(),
    createdAt: previousBook ? previousBook.createdAt : new Date().toISOString(),
  };

  if (!book.title) return;

  const saved = await saveBook(book, existingId);
  if (!saved) return;

  resetForm();

  document.querySelector("#library-title").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

function resetForm() {
  form.reset();
  editIdInput.value = "";
  currentRating = 0;
  setRating(0);
  saveButton.innerHTML = "Gem boganmeldelse <span>↗</span>";
  cancelEditButton.hidden = true;
  document.querySelector("#form-title").textContent = "Tilføj en bog";
}

cancelEditButton.addEventListener("click", resetForm);

function editBook(id) {
  const book = books.find((item) => item.id === id);
  if (!book) return;

  editIdInput.value = book.id;
  titleInput.value = book.title;
  authorInput.value = book.author;
  thoughtsInput.value = book.thoughts;
  favoriteInput.value = book.favorite;
  setRating(book.rating);

  saveButton.innerHTML = "Gem ændringer <span>↗</span>";
  cancelEditButton.hidden = false;
  document.querySelector("#form-title").textContent = "Rediger bog";

  document.querySelector(".form-card").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  titleInput.focus({ preventScroll: true });
}

async function deleteBook(id) {
  const book = books.find((item) => item.id === id);
  if (!book) return;

  if (!confirm(`Vil du slette "${book.title}" fra læseloggen?`)) {
    return;
  }

  const { error } = await supabaseClient.from("books").delete().eq("id", id);

  if (error) {
    console.error("Kunne ikke slette bog:", error);
    alert("Bogen kunne ikke slettes. Tjek forbindelsen til databasen.");
    return;
  }

  if (editIdInput.value === id) resetForm();
  await loadBooks();
}

function renderBooks() {
  const query = searchInput.value.trim().toLocaleLowerCase("da");

  const filteredBooks = books.filter((book) => `${book.title} ${book.author} ${book.thoughts} ${book.favorite}`.toLocaleLowerCase("da").includes(query));

  bookCount.textContent = `(${books.length})`;
  bookList.replaceChildren();
  emptyState.hidden = filteredBooks.length > 0;

  if (!books.length) {
    emptyState.textContent = "Jeres læselog er tom endnu. Tilføj den første bog ovenfor.";
  } else if (!filteredBooks.length) {
    emptyState.textContent = "Ingen bøger matcher din søgning.";
  }

  filteredBooks.forEach((book) => {
    const card = document.createElement("article");
    card.className = "book-card";

    const top = document.createElement("div");
    top.className = "book-card-top";

    const details = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = book.title;

    const author = document.createElement("p");
    author.className = "book-author";
    author.textContent = book.author || "Forfatter ikke angivet";

    details.append(heading, author);

    const rating = document.createElement("div");
    rating.className = "book-rating";
    rating.setAttribute("aria-label", `${book.rating} ud af 5 stjerner`);
    rating.textContent = "★".repeat(book.rating) + "☆".repeat(5 - book.rating);

    top.append(details, rating);
    card.append(top);

    if (book.thoughts) {
      const thoughts = document.createElement("p");
      thoughts.className = "book-thoughts";
      thoughts.textContent = book.thoughts;
      card.append(thoughts);
    }

    if (book.favorite) {
      const favorite = document.createElement("blockquote");
      favorite.className = "favorite-quote";
      favorite.textContent = book.favorite;
      card.append(favorite);
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Rediger";
    editButton.addEventListener("click", () => editBook(book.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Slet";
    deleteButton.addEventListener("click", () => deleteBook(book.id));

    actions.append(editButton, deleteButton);
    card.append(actions);
    bookList.append(card);
  });
}

searchInput.addEventListener("input", renderBooks);

setRating(0);
loadBooks();
