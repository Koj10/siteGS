window.loading = function(param, isLoading) {
    const loaderId = 'form-loader';
    
    let form;
    let actualIsLoading;
    
    if (typeof param === 'boolean') {
        actualIsLoading = param;
        form = null; // Форма не передана
    } else {
        form = param;
        actualIsLoading = isLoading;
    }
    
    if (actualIsLoading) {
        const loader = document.createElement('div');
        loader.id = loaderId;
        loader.className = 'loader';
        document.body.appendChild(loader);
        
        if (form) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.dataset.previousHtml = submitButton.innerHTML;
                submitButton.innerHTML = 'Отправка...';
            }
        }
    } else {
        // Удаляем лоадер
        const loader = document.getElementById(loaderId);
        if (loader) loader.remove();
        
        if (form) {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.dataset.previousHtml) {
                    submitButton.innerHTML = submitButton.dataset.previousHtml;
                }
            }
        }
    }
};