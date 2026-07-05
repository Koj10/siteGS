async function logout() {
    const jwtToken = getCookie('jwt_token');
    const pc_token = getCookie('pc_token');

    if (pc_token) {
        const data = { 
            token: pc_token, 
            status: "активен",
        };

        try {
            const response = await fetch('https://api.game-sense.ru/pc/status',  {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Ошибка при выходе");
            }

            await response.json(); // Можно убрать, если результат не нужен
        } catch (error) {
            showNotification(error.message);
            console.log(error.message);
        }
    }

    document.cookie = "jwt_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

    localStorage.removeItem("user");

    window.location.href = "/login";
}