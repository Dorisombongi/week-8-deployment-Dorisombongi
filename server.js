require('dotenv').config();
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');

// Create Express app
const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Welcome to the Expense Tracker Application!');
});




// ALREADY HAS AN EXPENSE_TRACKER TABLE IN MYSQL
//USER,EXPENSE AND BUDGET TABLES ALREADY CREATED

// MySQL Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
        connection.release();
    }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// Registration Endpoint
app.post('/register', [
    body('full_name').notEmpty().withMessage('Full Name is required'),
    body('email').isEmail().withMessage('Invalid email address').custom(async (email) => {
        const [rows] = await promisePool.query('SELECT * FROM User WHERE email = ?', [email]);
        if (rows.length > 0) {
            throw new Error('Email already in use');
        }
    }),
    body('username').isAlphanumeric().withMessage('Username must be alphanumeric').custom(async (username) => {
        const [rows] = await promisePool.query('SELECT * FROM User WHERE username = ?', [username]);
        if (rows.length > 0) {
            throw new Error('Username already in use');
        }
    }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await promisePool.query('INSERT INTO User (full_name, email, username, password) VALUES (?, ?, ?, ?)', [full_name, email, username, hashedPassword]);
        res.status(201).send({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send({ error: 'Error registering user' });
    }
});

// Login Endpoint
app.post('/login', [
    body('email-or-username').notEmpty().withMessage('Email or Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { 'email-or-username': emailOrUsername, password } = req.body;
    let user;

    try {
        // Check if email or username exists
        const [rows] = await promisePool.query('SELECT * FROM User WHERE email = ? OR username = ?', [emailOrUsername, emailOrUsername]);
        if (rows.length === 0) {
            return res.status(400).send('Invalid email or username');
        }
        user = rows[0];
        
        // Check password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).send('Invalid password');
        }

        // Store user session
        req.session.userId = user.id;
        res.send('Login successful');
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).send('Unauthorized');
};

// Example Protected Route
app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM User WHERE id = ?', [req.session.userId]);
        if (rows.length === 0) {
            return res.status(404).send('User not found');
        }
        res.send(rows[0]);
    } catch (error) {
        res.status(500).send('Error fetching user profile');
    }
});


// Expense Endpoint
app.post('/expense', [
    body('category').notEmpty().withMessage('Category is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { category, date, amount, description } = req.body;
    const userId = req.session.userId; // Retrieve user ID from session

    if (!userId) {
        return res.status(401).send('User not authenticated');
    }

    try {
        await promisePool.query('INSERT INTO Expense (user_id, category, date, amount, description) VALUES (?, ?, ?, ?, ?)', [userId, category, date, amount, description]);
        res.status(201).send({ message: 'Expense added successfully' });
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(500).send('Error adding expense');
    }
});

// Budget Endpoint
app.post('/budget', [
    body('start_date').notEmpty().withMessage('Date is required'),
    body('end_date').notEmpty().withMessage('Date is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { start_date, end_date, amount } = req.body;
    const userId = req.session.userId; // Retrieve user ID from session

    if (!userId) {
        return res.status(401).send('User not authenticated');
    }

    try {
        await promisePool.query('INSERT INTO Budget (user_id, start_date, end_date, amount) VALUES (?, ?, ?, ?)', [userId, start_date, end_date, amount]);
        res.status(201).send({ message: 'Budget added successfully' });
    } catch (error) {
        console.error('Error adding budget:', error);
        res.status(500).send('Error adding budget:' + error.message);
    }
});


// Get User Info Endpoint
app.get('/user-info', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT username FROM User WHERE id = ?', [req.session.userId]);
        if (rows.length === 0) {
            return res.status(404).send('User not found');
        }
        res.json({ username: rows[0].username });
    } catch (error) {
        res.status(500).send('Error fetching user info');
    }
});

// Get Total Spent Endpoint
app.get('/total-spent', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const [rows] = await promisePool.query('SELECT SUM(amount) AS totalSpent FROM Expense WHERE user_id = ?', [userId]);
        
        const totalSpent = Number(rows[0].totalSpent) || 0; 
        res.json({ totalSpent });
    } catch (error) {
        console.error('Error fetching total spent:', error);
        res.status(500).send('Error fetching total spent');
    }
});


// Total Budget Endpoint
app.get('/total-budget', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const [rows] = await promisePool.query('SELECT SUM(amount) AS totalBudget FROM Budget WHERE user_id = ?', [userId]);
        
        const totalBudget = Number(rows[0].totalBudget) || 0; 
        res.json({ totalBudget });
    } catch (error) {
        console.error('Error fetching total budget:', error);
        res.status(500).send('Error fetching total budget');
    }
});


// Endpoint to Fetch User's Expenses
app.get('/expenses', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Fetch expenses for the logged-in user
        const [rows] = await promisePool.query('SELECT * FROM Expense WHERE user_id = ? ORDER BY date DESC', [userId]);

        // Return the expenses
        res.json(rows);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).send('Error fetching expenses');
    }
});



// Endpoint to fetch total budget
app.get('/total-budget', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [rows] = await promisePool.query('SELECT SUM(amount) AS totalBudget FROM Budget WHERE user_id = ?', [userId]);
        const totalBudget = Number(rows[0].totalBudget) || 0;
        res.json({ totalBudget });
    } catch (error) {
        console.error('Error fetching total budget:', error);
        res.status(500).send('Error fetching total budget');
    }
});


// New endpoint to fetch both expenses and budgets
app.get('/transactions', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Fetch expenses
        const [expensesRows] = await promisePool.query('SELECT category AS description, date, amount, "Expense" AS transaction FROM Expense WHERE user_id = ?', [userId]);

        // Fetch budgets
        const [budgetsRows] = await promisePool.query('SELECT CONCAT(start_date, " to ", end_date) AS description, end_date AS date, amount, "Budget" AS transaction FROM Budget WHERE user_id = ?', [userId]);

        // Combine expenses and budgets
        const transactions = [
            ...expensesRows,
            ...budgetsRows
        ];

        // Respond with combined transactions
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Error fetching transactions');
    }
});


// Middleware to parse JSON request bodies
app.use(express.json());

// Update Expense Endpoint
app.put('/expenses/:expense_id', [
    body('category').notEmpty().withMessage('Category is required'),
    body('date').isDate().withMessage('Invalid date format'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { category, date, amount, description } = req.body;
    const expenseId = req.params.expense_id;

    try {
        await promisePool.query(
            'UPDATE Expense SET category = ?, date = ?, amount = ?, description = ? WHERE expense_id = ?',
            [category, date, amount, description, expenseId]
        );
        res.status(200).send({ message: 'Expense updated successfully' });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).send('Error updating expense');
    }
});

// Get Single Expense Endpoint
app.get('/expense/:expense_id', isAuthenticated, async (req, res) => {
    const expenseId = req.params.expense_id;
    const userId = req.session.userId;

    try {
        const [rows] = await promisePool.query('SELECT * FROM Expense WHERE expense_id = ? AND user_id = ?', [expenseId, userId]);

        if (rows.length === 0) {
            return res.status(404).send('Expense not found');
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).send('Error fetching expense');
    }
});

// Update Expense Endpoint
app.put('/expense/:expense_id', [
    body('category').notEmpty().withMessage('Category is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('description').notEmpty().withMessage('Description is required')
], isAuthenticated, async (req, res) => {
    const expenseId = req.params.expense_id;
    const { category, date, amount, description } = req.body;
    const userId = req.session.userId;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const [result] = await promisePool.query('UPDATE Expense SET category = ?, date = ?, amount = ? , description = ? WHERE expense_id = ? AND user_id = ?', [category, date, amount, description, expenseId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).send('Expense not found or you do not have permission to update it');
        }

        res.send({ message: 'Expense updated successfully' });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).send('Error updating expense');
    }
});


// Endpoint to Fetch User's Budgets
app.get('/budgets', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Fetch budgets for the logged-in user
        const [rows] = await promisePool.query('SELECT * FROM Budget WHERE user_id = ? ORDER BY end_date DESC', [userId]);

        // Return the budgets
        res.json(rows);
    } catch (error) {
        console.error('Error fetching budgets:', error);
        res.status(500).send('Error fetching budgets');
    }
});

// Update Budget Endpoint
app.put('/budget/:budget_id', [
    body('start_date').notEmpty().withMessage('Date is required'),
    body('end_date').notEmpty().withMessage('Date is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
], async (req, res) => {
    const budgetId = req.params.budget_id;
    const { start_date, end_date, amount } = req.body;
    const userId = req.session.userId;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const [result] = await promisePool.query(
            'UPDATE Budget SET start_date = ?, end_date = ?, amount = ? WHERE budget_id = ? AND user_id = ?',
            [start_date, end_date, amount, budgetId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send('Budget not found or you do not have permission to update it');
        }

        res.send({ message: 'Budget updated successfully' });
    } catch (error) {
        console.error('Error updating budget:', error);
        res.status(500).send('Error updating budget');
    }
});

// Get Single Budget Endpoint
app.get('/budget/:budget_id', async (req, res) => {
    const budgetId = req.params.budget_id;
    const userId = req.session.userId;

    try {
        const [rows] = await promisePool.query('SELECT * FROM Budget WHERE budget_id = ? AND user_id = ?', [budgetId, userId]);

        if (rows.length === 0) {
            return res.status(404).send('Budget not found');
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching budget:', error);
        res.status(500).send('Error fetching budget');
    }
});







    // Delete Multiple Expenses Endpoint
app.delete('/expenses', isAuthenticated, async (req, res) => {
    const { expenseIds } = req.body;

    if (!Array.isArray(expenseIds) || expenseIds.length === 0) {
        return res.status(400).send('No expenses to delete');
    }

    try {
        // Build query
        const query = 'DELETE FROM Expense WHERE expense_id IN (?) AND user_id = ?';
        const [result] = await promisePool.query(query, [expenseIds, req.session.userId]);

        if (result.affectedRows === 0) {
            return res.status(404).send('No expenses found to delete');
        }

        res.send({ message: 'Expenses deleted successfully' });
    } catch (error) {
        console.error('Error deleting expenses:', error);
        res.status(500).send('Error deleting expenses');
    }
});



// Delete Multiple Budgets Endpoint
app.delete('/budgets', isAuthenticated, async (req, res) => {
    const { budgetIds } = req.body;

    if (!Array.isArray(budgetIds) || budgetIds.length === 0) {
        return res.status(400).send('No budget to delete');
    }

    try {
        // Build query
        const query = 'DELETE FROM Budget WHERE budget_id IN (?) AND user_id = ?';
        const [result] = await promisePool.query(query, [budgetIds, req.session.userId]);

        if (result.affectedRows === 0) {
            return res.status(404).send('No budget found to delete');
        }

        res.send({ message: 'Budgets deleted successfully' });
    } catch (error) {
        console.error('Error deleting budgets:', error);
        res.status(500).send('Error deleting budgets');
    }
});




app.listen(port, () => {
    console.log(`Server is running on port 3000`);
});

module.exports = app; // Export the Express app instance