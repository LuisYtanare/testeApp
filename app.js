const STORAGE_KEY = 'admin_transactions';
const THEME_KEY = 'admin_theme';

const expenseForm = document.getElementById('expense-form');
const incomeForm = document.getElementById('income-form');
const transactionList = document.getElementById('transaction-list');
const totalBalanceEl = document.getElementById('total-balance');
const summaryIncomeEl = document.getElementById('summary-income');
const summaryExpenseEl = document.getElementById('summary-expense');
const statusBadgeEl = document.getElementById('status-badge');
const statusTextEl = document.getElementById('status-text');
const categoryTotalsList = document.getElementById('category-totals-list');
const themeToggleBtn = document.getElementById('theme-toggle');

let pieChartInstance = null;
let lineChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderUI();
  checkMonthlyStatement();
});

// Control de pestañas para vista responsive en smartphones
function switchFormTab(type) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => tab.classList.remove('active'));

  document.getElementById('form-expense-card').classList.remove('active-tab');
  document.getElementById('form-income-card').classList.remove('active-tab');

  if (type === 'expense') {
    tabs[0].classList.add('active');
    document.getElementById('form-expense-card').classList.add('active-tab');
  } else {
    tabs[1].classList.add('active');
    document.getElementById('form-income-card').classList.add('active-tab');
  }
}

// Modo Oscuro
themeToggleBtn.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
  themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// Event Listeners de Formularios
expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addTransaction('gasto', 'description', 'amount', 'category');
  expenseForm.reset();
});

incomeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addTransaction('ingreso', 'inc-description', 'inc-amount', 'inc-category');
  incomeForm.reset();
});

function addTransaction(type, descId, amountId, catId) {
  const newTx = {
    id: Date.now(),
    type: type,
    description: document.getElementById(descId).value,
    amount: parseFloat(document.getElementById(amountId).value),
    category: document.getElementById(catId).value,
    date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
  txs = txs.filter(tx => tx.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  renderUI();
}

function renderUI() {
  const txs = getTransactions();
  transactionList.innerHTML = '';
  
  let totalIncome = 0;
  let totalExpense = 0;
  const expenseCategories = {};

  txs.forEach((tx) => {
    if (tx.type === 'ingreso') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
      expenseCategories[tx.category] = (expenseCategories[tx.category] || 0) + tx.amount;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="type-badge type-${tx.type}">${tx.type.substring(0,3).toUpperCase()}</span></td>
      <td>${tx.date}</td>
      <td>${tx.description}</td>
      <td>${tx.category}</td>
      <td>$${tx.amount.toFixed(2)}</td>
      <td>
        <button class="btn btn-danger" onclick="deleteTransaction(${tx.id})">✕</button>
      </td>
    `;
    transactionList.appendChild(row);
  });

  const netBalance = totalIncome - totalExpense;

  // Actualización del Balance General
  totalBalanceEl.textContent = netBalance.toFixed(2);
  summaryIncomeEl.textContent = totalIncome.toFixed(2);
  summaryExpenseEl.textContent = totalExpense.toFixed(2);

  // Evaluación de Saldo Positivo / Negativo
  if (netBalance >= 0) {
    statusBadgeEl.className = 'status-badge status-positive';
    statusTextEl.textContent = 'Saldo Positivo';
  } else {
    statusBadgeEl.className = 'status-badge status-negative';
    statusTextEl.textContent = 'Saldo Negativo';
  }

  renderCategoryTotals(expenseCategories);
  renderCharts(txs, expenseCategories);
}

function renderCategoryTotals(totals) {
  categoryTotalsList.innerHTML = '';
  const categories = Object.keys(totals);

  if (categories.length === 0) {
    categoryTotalsList.innerHTML = '<li class="category-item"><span>Sin gastos</span></li>';
    return;
  }

  categories.forEach((cat) => {
    const li = document.createElement('li');
    li.className = 'category-item';
    li.innerHTML = `
      <span>${cat}</span>
      <strong>$${totals[cat].toFixed(2)}</strong>
    `;
    categoryTotalsList.appendChild(li);
  });
}

function renderCharts(txs, expenseCategories) {
  if (pieChartInstance) pieChartInstance.destroy();
  if (lineChartInstance) lineChartInstance.destroy();

  const pieCtx = document.getElementById('pieChart').getContext('2d');
  pieChartInstance = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: Object.keys(expenseCategories),
      datasets: [{
        data: Object.values(expenseCategories),
        backgroundColor: ['#ef4444', '#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899']
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });

  const dates = [...new Set(txs.map(tx => tx.date))];
  const incomeByDate = dates.map(date => 
    txs.filter(tx => tx.date === date && tx.type === 'ingreso').reduce((sum, tx) => sum + tx.amount, 0)
  );
  const expenseByDate = dates.map(date => 
    txs.filter(tx => tx.date === date && tx.type === 'gasto').reduce((sum, tx) => sum + tx.amount, 0)
  );

  const lineCtx = document.getElementById('lineChart').getContext('2d');
  lineChartInstance = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Ingresos',
          data: incomeByDate,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Gastos',
          data: expenseByDate,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// LÓGICA DE CORTE MENSUAL Y GENERACIÓN DE PDF
function checkMonthlyStatement() {
  const today = new Date();
  const currentDay = today.getDate();

  if (currentDay >= 10) {
    const banner = document.getElementById('monthly-statement-banner');
    const btn = document.getElementById('download-statement-btn');
    
    const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const monthName = previousMonthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    
    document.getElementById('statement-title').textContent = `Extracto de ${monthName.toUpperCase()}`;
    banner.style.display = 'block';

    btn.onclick = () => generateDirectPDF(previousMonthDate);
  }
}

function generateDirectPDF(targetDate) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const txs = getTransactions();
  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();

  const monthTxs = txs.filter(tx => {
    const [day, month, year] = tx.date.split('/');
    const txDate = new Date(year, month - 1, day);
    return txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
  });

  if (monthTxs.length === 0) {
    alert("No se encontraron registros financieros almacenados para el mes anterior.");
    return;
  }

  let totalIngresos = 0;
  let totalGastos = 0;

  monthTxs.forEach(tx => {
    if (tx.type === 'ingreso') totalIngresos += tx.amount;
    else totalGastos += tx.amount;
  });

  const balanceNeto = totalIngresos - totalGastos;
  const monthLabel = targetDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("EXTRACTO FINANCIERO MENSUAL", 14, 18);
  doc.setFontSize(10);
  doc.text(`PERÍODO: ${monthLabel}`, 14, 24);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen General", 14, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`(+) Total Ingresos: $${totalIngresos.toFixed(2)}`, 14, 50);
  doc.text(`(-) Total Gastos: $${totalGastos.toFixed(2)}`, 14, 56);
  
  doc.setFont("helvetica", "bold");
  doc.text(`(=) Balance Neto: $${balanceNeto.toFixed(2)}`, 14, 64);

  const tableData = monthTxs.map(tx => [
    tx.date,
    tx.type.toUpperCase(),
    tx.description,
    tx.category,
    `$${tx.amount.toFixed(2)}`
  ]);

  doc.autoTable({
    startY: 72,
    head: [['Fecha', 'Tipo', 'Descripción', 'Categoría/Fuente', 'Monto']],
    body: tableData,
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      1: { fontStyle: 'bold' },
      4: { halign: 'right' }
    }
  });

  const fileName = `Extracto_${monthLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}