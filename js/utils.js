export const byId = (id) => document.getElementById(id);

export const moneyZA = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 2
    }).format(amount);
};

// Debounce function to stop search flickering
export const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Create a data URI from the SVG content provided
export const svgToUrl = (svgString) => {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
};