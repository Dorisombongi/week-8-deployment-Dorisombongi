
document.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            // Display the login successful message
            const messageDiv = document.getElementById('login-message');
            messageDiv.style.display = 'block';

            // Redirect to the dashboard page after displaying the message
            setTimeout(function() {
                window.location.href = 'dashboard.html';
            }, 500); // 500 milliseconds delay  to allow message to be seen
        } else {
            const result = await response.text();
            alert(result); // Show the server's error message
        }
    } catch (error) {
        alert('Error logging in');
    }
});