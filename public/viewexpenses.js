// Function to fetch expenses and render the table and chart
let expenseChart;

async function fetchExpenses() {
    try {
        const response = await fetch('/expenses');
        if (response.ok) {
            const expenses = await response.json();
            console.log('Expenses response:', expenses);

            const tbody = document.getElementById('expense-tbody');
            tbody.innerHTML = ''; // Clear existing rows

            let categoryTotals = {}; // Object to store total amounts by category

            expenses.forEach(expense => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input type="checkbox" class="expense-checkbox" value="${expense.expense_id}"></td>
                    <td>${expense.category}</td>
                    <td>${new Date(expense.date).toLocaleDateString()}</td>
                    <td>$${parseFloat(expense.amount).toFixed(2)}</td>
                    <td>${expense.description}</td>
                    <td><button onclick="editExpense(${expense.expense_id})">Edit</button></td>
                `;
                tbody.appendChild(row);

                // Calculate totals by category
                if (!categoryTotals[expense.category]) {
                    categoryTotals[expense.category] = 0;
                }
                categoryTotals[expense.category] += parseFloat(expense.amount);
            });

            // Sort categories by total amounts in ascending order
            const sortedCategoryTotals = Object.entries(categoryTotals).sort((a, b) => a[1] - b[1]);

            // Convert sorted entries back to object format for chart data
            const sortedLabels = sortedCategoryTotals.map(entry => entry[0]);
            const sortedData = sortedCategoryTotals.map(entry => entry[1]);

            // Render or update the chart with sorted data
            renderChart(sortedLabels, sortedData);
        } else {
            console.error('Failed to fetch expenses:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching expenses:', error);
    }
}

// Function to render or update the chart
function renderChart(labels, data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    // Destroy existing chart if it exists
    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Expenses by Category',
                data: data,
                backgroundColor: 'rgba(0, 123, 255, 0.6)',
                borderColor: 'rgba(0, 123, 255, 0.6)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Function to navigate back to the dashboard
function goBack() {
    window.location.href = 'dashboard.html';
}


        async function editExpense(expense_id) {
            try {
                const response = await fetch(`/expense/${expense_id}`);
                if (response.ok) {
                    const expense = await response.json();
                    document.getElementById('expenseId').value = expense.expense_id;
                    document.getElementById('category').value = expense.category;
                    document.getElementById('date').value = new Date(expense.date).toISOString().split('T')[0];
                    document.getElementById('amount').value = expense.amount;
                    document.getElementById('description').value = expense.description;
                    document.getElementById('editModal').style.display = 'block';
                } else {
                    console.error('Failed to fetch expense:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching expense:', error);
            }
        }


       

        function closeModal() {
            document.getElementById('editModal').style.display = 'none';
        }

        document.getElementById('editForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            const expense_id = document.getElementById('expenseId').value;
            const category = document.getElementById('category').value;
            const date = document.getElementById('date').value;
            const amount = document.getElementById('amount').value;
            const description = document.getElementById('description').value;

            try {
                const response = await fetch(`/expense/${expense_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ category, date, amount, description })
                });

                if (response.ok) {
                    alert('Expense updated successfully');
                    fetchExpenses(); // Refresh the expenses table
                    closeModal();
                } else {
                    console.error('Failed to update expense:', response.statusText);
                }
            } catch (error) {
                console.error('Error updating expense:', error);
            }
        });


        async function deleteSelectedExpenses() {
            const checkboxes = document.querySelectorAll('.expense-checkbox:checked');
            const expenseIds = Array.from(checkboxes).map(cb => cb.value);

            if (expenseIds.length === 0) {
                alert('No expenses selected');
                return;
            }

            if (!confirm('Are you sure you want to delete the selected expenses?')) {
                return;
            }

            try {
                const response = await fetch('/expenses', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ expenseIds })
                });

                if (response.ok) {
                    alert('Expenses deleted successfully');
                    fetchExpenses(); // Refresh the expenses table
                } else {
                    console.error('Failed to delete expenses:', response.statusText);
                }
            } catch (error) {
                console.error('Error deleting expenses:', error);
            }
        }


        // Fetch expenses when the page loads
        document.addEventListener('DOMContentLoaded', () => {
            fetchExpenses();
        });
    