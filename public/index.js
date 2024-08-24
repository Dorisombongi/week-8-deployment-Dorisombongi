
        async function fetchUserInfo() {
            try {
                const response = await fetch('/user-info');
                if (response.ok) {
                    const data = await response.json();
                    document.getElementById('username').textContent = data.username;
                    updateAuthButton(true); // User is logged in
                } else {
                    updateAuthButton(false); // User is logged out
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
                updateAuthButton(false); // Error fetching user info, assume logged out
            }
        }


        async function fetchTotalSpent() {
    try {
        const response = await fetch('/total-spent');
        if (response.ok) {
            const data = await response.json();
            console.log('Total spent response:', data); // Log the response data
            
            // Ensure totalSpent is a number 
            if (typeof data.totalSpent === 'number') {
                document.getElementById('total-spent').textContent = data.totalSpent.toFixed(2);
            } else {
                console.error('Total spent is not a number:', data.totalSpent);
                document.getElementById('total-spent').textContent = '0.00'; 
            }
        } else {
            console.error('Failed to fetch total spent:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching total spent:', error);
    }
}


async function fetchTotalBudget() {
            try {
                const response = await fetch('/total-budget');
                if (response.ok) {
                    const data = await response.json();
                    console.log('Total budget response:', data);
                    
                    if (typeof data.totalBudget === 'number') {
                        document.getElementById('total-budget').textContent = data.totalBudget.toFixed(2);
                    } else {
                        console.error('Total budget is not a number:', data.totalBudget);
                        document.getElementById('total-budget').textContent = '0.00'; // Fallback
                    }
                } else {
                    console.error('Failed to fetch total budget:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching total budget:', error);
            }
        }


        



        function calculateBalance() {
            const budget = parseFloat(document.getElementById('total-budget').textContent) || 0;
            const spent = parseFloat(document.getElementById('total-spent').textContent) || 0;
            const balance = budget - spent;
            document.getElementById('total-balance').textContent = balance.toFixed(2);
        }

        function updateAuthButton(isLoggedIn) {
            const authButton = document.getElementById('auth-button');
            if (isLoggedIn) {
                authButton.textContent = 'Logout';
                authButton.setAttribute('onclick', 'logout()');
            } else {
                authButton.textContent = 'Login';
                authButton.setAttribute('onclick', 'login()');
            }
        }



        function logout() {
            // Display the logout message
            const messageDiv = document.getElementById('logout-message');
            messageDiv.style.display = 'block';
        
            // Redirect to the login page after displaying the message
            setTimeout(function() {
                window.location.href = 'login.html';
            }, 500); // 500 milliseconds delay  to allow message to be seen
        }

        function login() {
            window.location.href = 'login.html'; 
        }

        function addExpense() {
            // Redirect to the expense page
            window.location.href = 'expense.html';
        }

        function addBudget() {
            // Redirect to the expense page
            window.location.href = 'budget.html';
        }

        function viewExpenses() {
            // Redirect to the expenses page
            window.location.href = 'viewexpenses.html';
        }

        function viewTransactions() {
            // Redirect to the transactions page
            window.location.href = 'transactions.html';
        }

        function viewBudgets() {
            // Redirect to the transactions page
            window.location.href = 'viewbudgets.html';
        }

         // Fetch user info and total spent when the page loads
         document.addEventListener('DOMContentLoaded', () => {
            fetchUserInfo();
            fetchTotalSpent();
            fetchTotalBudget();
            // Call calculateBalance after data is fetched
            Promise.all([fetchTotalBudget(), fetchTotalSpent()]).then(() => {
                calculateBalance();
            });
        });

        