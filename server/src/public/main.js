
async function changePassword() {
    const password = document.getElementById('password').value;
    const repeatPassword = document.getElementById('repeatPassword').value;
    const response = await fetch('http://localhost:3000/api/auth/reset-password/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            password: password,
            repeatPassword: repeatPassword,
        })
    })
    const data = await response.json();
    if (!response.ok) {
        alert(data.message);
        return;
    }
    alert(data.message);
    window.location.href="https://glueeed.dev"
}