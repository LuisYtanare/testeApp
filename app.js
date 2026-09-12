const STORAGE_KEY = "admin_transactions";
const THEME_KEY = "admin_theme";
const LOANS_KEY = "admin_loans";
const CATS_KEY = "admin_custom_categories";

// Categorías Por Defecto
const DEFAULT_CATEGORIES = {
  gasto: [
    "Auto",
    "Arriendo",
    "Servicios",
    "Gastos Tiendas",
    "Muebles",
    "Cartones Crédito",
  ],
  ingreso: ["Salario", "Horas Extra", "Préstamos", "Bonos y Premios"],
};

let pieChartInstance = null;
let lineChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initDates();
  initCategories();
  renderUI();
  renderLoans();
  checkMonthlyStatement();
  setupLiveLoanCalculator();
});

// NAVEGACIÓN ENTRE SECCIONES (NAVBAR)
function switchMainTab(viewId) {
  document
    .querySelectorAll(".nav-link")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".main-view")
    .forEach((view) => view.classList.remove("active-view"));

  document.getElementById(viewId).classList.add("active-view");

  // Activar botón nav correspondiente
  if (viewId === "dashboard-view")
    document.querySelectorAll(".nav-link")[0].classList.add("active");
  if (viewId === "loans-view")
    document.querySelectorAll(".nav-link")[1].classList.add("active");
  if (viewId === "categories-view")
    document.querySelectorAll(".nav-link")[2].classList.add("active");
}

function switchFormTab(type) {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => tab.classList.remove("active"));

  document.getElementById("form-expense-card").classList.remove("active-tab");
  document.getElementById("form-income-card").classList.remove("active-tab");

  if (type === "expense") {
    tabs[0].classList.add("active");
    document.getElementById("form-expense-card").classList.add("active-tab");
  } else {
    tabs[1].classList.add("active");
    document.getElementById("form-income-card").classList.add("active-tab");
  }
}

// INICIALIZACIÓN DE FECHAS EN INPUTS
function initDates() {
  const todayISO = new Date().toISOString().split("T")[0];
  document.getElementById("tx-date").value = todayISO;
  document.getElementById("inc-tx-date").value = todayISO;
  document.getElementById("loan-start-date").value = todayISO;
}

// GESTIÓN DE CATEGORÍAS PERSONALIZADAS
function getCategories() {
  const stored = localStorage.getItem(CATS_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
}

function initCategories() {
  const cats = getCategories();

  const expenseSelect = document.getElementById("category");
  const incomeSelect = document.getElementById("inc-category");

  expenseSelect.innerHTML = cats.gasto
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
  incomeSelect.innerHTML = cats.ingreso
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  renderCategoriesList();
}

document.getElementById("custom-cat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("cat-name").value.trim();
  const type = document.getElementById("cat-type").value;

  if (!name) return;

  const cats = getCategories();
  if (!cats[type].includes(name)) {
    cats[type].push(name);
    localStorage.setItem(CATS_KEY, JSON.stringify(cats));
    initCategories();
    document.getElementById("cat-name").value = "";
  }
});

function deleteCategory(type, catName) {
  const cats = getCategories();
  cats[type] = cats[type].filter((c) => c !== catName);
  localStorage.setItem(CATS_KEY, JSON.stringify(cats));
  initCategories();
}

function renderCategoriesList() {
  const cats = getCategories();
  const expList = document.getElementById("custom-expense-cats");
  const incList = document.getElementById("custom-income-cats");

  expList.innerHTML = cats.gasto
    .map(
      (c) => `
    <li class="category-item">
      <span>${c}</span>
      <button class="btn btn-danger" onclick="deleteCategory('gasto', '${c}')">✕</button>
    </li>
  `,
    )
    .join("");

  incList.innerHTML = cats.ingreso
    .map(
      (c) => `
    <li class="category-item">
      <span>${c}</span>
      <button class="btn btn-danger" onclick="deleteCategory('ingreso', '${c}')">✕</button>
    </li>
  `,
    )
    .join("");
}

// TRANSACCIONES Y NAVEGACIÓN DENTRO DEL DASHBOARD
const expenseForm = document.getElementById("expense-form");
const incomeForm = document.getElementById("income-form");

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTransaction("gasto", "description", "amount", "category", "tx-date");
  expenseForm.reset();
  initDates();
});

incomeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTransaction(
    "ingreso",
    "inc-description",
    "inc-amount",
    "inc-category",
    "inc-tx-date",
  );
  incomeForm.reset();
  initDates();
});

function addTransaction(type, descId, amountId, catId, dateId) {
  const newTx = {
    id: Date.now(),
    type: type,
    description: document.getElementById(descId).value,
    amount: parseFloat(document.getElementById(amountId).value),
    category: document.getElementById(catId).value,
    isoDate: document.getElementById(dateId).value,
  };

  const txs = getTransactions();
  txs.push(newTx);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  renderUI();
}

function getTransactions() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function deleteTransaction(id) {
  let txs = getTransactions();
  txs = txs.filter((tx) => tx.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  renderUI();
}

// PRÉSTAMOS, JUROS Y PARCELAS
const loanForm = document.getElementById("loan-form");

loanForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("loan-title").value;
  const amount = parseFloat(document.getElementById("loan-amount").value);
  const rate = parseFloat(document.getElementById("loan-rate").value);
  const parcels = parseInt(document.getElementById("loan-parcels").value);
  const startDate = document.getElementById("loan-start-date").value;

  // Cálculo de Juros Simple para Parcelas
  const totalInterest = amount * (rate / 100) * parcels;
  const totalFinal = amount + totalInterest;
  const parcelValue = totalFinal / parcels;

  const newLoan = {
    id: Date.now(),
    title,
    amount,
    rate,
    parcels,
    parcelValue,
    totalFinal,
    startDate,
  };

  const loans = getLoans();
  loans.push(newLoan);
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));

  loanForm.reset();
  initDates();
  renderLoans();
});

function getLoans() {
  const data = localStorage.getItem(LOANS_KEY);
  return data ? JSON.parse(data) : [];
}

function deleteLoan(id) {
  let loans = getLoans();
  loans = loans.filter((l) => l.id !== id);
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
  renderLoans();
}

function setupLiveLoanCalculator() {
  const inputs = ["loan-amount", "loan-rate", "loan-parcels"];
  inputs.forEach((id) => {
    document.getElementById(id).addEventListener("input", calculateLoanPreview);
  });
}

function calculateLoanPreview() {
  const amount = parseFloat(document.getElementById("loan-amount").value) || 0;
  const rate = parseFloat(document.getElementById("loan-rate").value) || 0;
  const parcels = parseInt(document.getElementById("loan-parcels").value) || 1;

  const totalInterest = amount * (rate / 100) * parcels;
  const totalFinal = amount + totalInterest;
  const parcelValue = totalFinal / parcels;

  document.getElementById("loan-preview-parcel").textContent =
    `$${parcelValue.toFixed(2)}`;
  document.getElementById("loan-preview-total").textContent =
    `$${totalFinal.toFixed(2)}`;
}

function renderLoans() {
  const loans = getLoans();
  const list = document.getElementById("loans-list");
  list.innerHTML = "";

  loans.forEach((l) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${l.title}</strong></td>
      <td>$${l.amount.toFixed(2)}</td>
      <td>${l.rate}%</td>
      <td>${l.parcels}x</td>
      <td class="text-danger"><strong>$${l.parcelValue.toFixed(2)}</strong></td>
      <td>$${l.totalFinal.toFixed(2)}</td>
      <td>${formatDateDisplay(l.startDate)}</td>
      <td><button class="btn btn-danger" onclick="deleteLoan(${l.id})">✕</button></td>
    `;
    list.appendChild(row);
  });
}

// FUNCIONES AUXILIARES Y RENDERIZADO GENERAL
function renderUI() {
  const txs = getTransactions();
  const transactionList = document.getElementById("transaction-list");
  transactionList.innerHTML = "";

  let totalIncome = 0;
  let totalExpense = 0;
  const expenseCategories = {};

  [...txs].reverse().forEach((tx) => {
    if (tx.type === "ingreso") {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
      expenseCategories[tx.category] =
        (expenseCategories[tx.category] || 0) + tx.amount;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="type-badge type-${tx.type}">${tx.type.substring(0, 3).toUpperCase()}</span></td>
      <td>${formatDateDisplay(tx.isoDate)}</td>
      <td>${tx.description}</td>
      <td><span class="badge-cat">${tx.category}</span></td>
      <td>$${tx.amount.toFixed(2)}</td>
      <td><button class="btn btn-danger" onclick="deleteTransaction(${tx.id})">✕</button></td>
    `;
    transactionList.appendChild(row);
  });

  const netBalance = totalIncome - totalExpense;

  document.getElementById("total-balance").textContent = netBalance.toFixed(2);
  document.getElementById("summary-income").textContent =
    totalIncome.toFixed(2);
  document.getElementById("summary-expense").textContent =
    totalExpense.toFixed(2);

  const statusBadge = document.getElementById("status-badge");
  const statusText = document.getElementById("status-text");

  if (netBalance >= 0) {
    statusBadge.className = "status-badge status-positive";
    statusText.textContent = "Saldo Positivo";
  } else {
    statusBadge.className = "status-badge status-negative";
    statusText.textContent = "Saldo Negativo";
  }

  renderCategoryTotals(expenseCategories);
  renderCharts(txs, expenseCategories);
}

function formatDateDisplay(isoStr) {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-");
  return `${d}/${m}/${y}`;
}

function renderCategoryTotals(totals) {
  const list = document.getElementById("category-totals-list");
  list.innerHTML = "";
  const categories = Object.keys(totals);

  if (categories.length === 0) {
    list.innerHTML = '<li class="category-item"><span>Sin gastos</span></li>';
    return;
  }

  categories.forEach((cat) => {
    const li = document.createElement("li");
    li.className = "category-item";
    li.innerHTML = `<span>${cat}</span><strong>$${totals[cat].toFixed(2)}</strong>`;
    list.appendChild(li);
  });
}

function renderCharts(txs, expenseCategories) {
  if (pieChartInstance) pieChartInstance.destroy();
  if (lineChartInstance) lineChartInstance.destroy();

  const pieCtx = document.getElementById("pieChart").getContext("2d");
  pieChartInstance = new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: Object.keys(expenseCategories),
      datasets: [
        {
          data: Object.values(expenseCategories),
          backgroundColor: [
            "#ef4444",
            "#2563eb",
            "#f59e0b",
            "#10b981",
            "#8b5cf6",
            "#ec4899",
            "#6366f1",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });

  const sortedDates = [...new Set(txs.map((tx) => tx.isoDate))].sort();
  const incomeByDate = sortedDates.map((d) =>
    txs
      .filter((tx) => tx.isoDate === d && tx.type === "ingreso")
      .reduce((s, tx) => s + tx.amount, 0),
  );
  const expenseByDate = sortedDates.map((d) =>
    txs
      .filter((tx) => tx.isoDate === d && tx.type === "gasto")
      .reduce((s, tx) => s + tx.amount, 0),
  );

  const lineCtx = document.getElementById("lineChart").getContext("2d");
  lineChartInstance = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: sortedDates.map(formatDateDisplay),
      datasets: [
        {
          label: "Ingresos",
          data: incomeByDate,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Gastos",
          data: expenseByDate,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { position: "bottom" } },
    },
  });
}

// MODO OSCURO
const themeToggleBtn = document.getElementById("theme-toggle");
themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  themeToggleBtn.textContent = newTheme === "dark" ? "☀️" : "🌙";
});

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeToggleBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";
}

function checkMonthlyStatement() {
  const today = new Date();
  if (today.getDate() >= 10) {
    const banner = document.getElementById("monthly-statement-banner");
    banner.style.display = "block";
  }
}
