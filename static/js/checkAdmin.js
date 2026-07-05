const userData = localStorage.getItem('user');
if (userData) {
	const user = JSON.parse(userData);
	if (user.role !== "admin") {
            window.location.href = "/";
        }
}