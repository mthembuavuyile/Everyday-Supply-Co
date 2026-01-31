/**
 * js/data.js
 * MOCK DATABASE
 */

export const products = [
    { id: 1, name: "Sunlight Dish Liquid", size: "750ml", category: "Cleaning", price: 24.99, unitPrice: "R0.03 / ml", image: "images/Sunlight Dish Liquid.jpg", badge: { type: "hot", text: "Best Seller" } },
    { id: 2, name: "Tastic Rice", size: "2kg", category: "Pantry", price: 38.50, unitPrice: "R19.25/kg", image: "images/tastic-rice.jpg", badge: null },
    { id: 3, name: "Chicken Noodles (Box)", size: "48 x 75g", category: "Bulk", price: 115.00, unitPrice: "R2.40/ea", image: "https://placehold.co/400x400/eef2f6/F7B733?text=Noodles+Box", badge: { type: "bulk", text: "Bulk Deal" } },
    { id: 4, name: "Domestos Bleach", size: "750ml", category: "Cleaning", price: 32.00, unitPrice: null, image: "https://placehold.co/400x400/eef2f6/0E7A5F?text=Bleach", badge: null },
    { id: 5, name: "Baby Soft Toilet Paper", size: "9 Pack", category: "Household", price: 89.99, unitPrice: "R10/roll", image: "images/tissue.jpg", badge: null },
    { id: 6, name: "Jacobs Coffee", size: "200g", category: "Pantry", price: 149.00, unitPrice: null, image: "https://placehold.co/400x400/eef2f6/0E7A5F?text=Coffee", badge: null },
    { id: 7, name: "Omo Auto Washing Powder", size: "2kg", category: "Cleaning", price: 125.00, unitPrice: null, image: "https://placehold.co/400x400/eef2f6/F7B733?text=Omo", badge: { type: "hot", text: "Hot" } },
    { id: 8, name: "Coca-Cola Original", size: "2L", category: "Drinks", price: 26.00, unitPrice: null, image: "https://placehold.co/400x400/eef2f6/E53E3E?text=Coke", badge: null },

    // Additional items from your second array
    { id: 9, name: "Handy Andy Cream", size: "750ml", category: "Cleaning", price: 29.50, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/0E7A5F?text=Cream+Cleaner", badge: null },
    { id: 10, name: "Chicken Noodles (Box of 24)", size: null, category: "Pantry", price: 115.00, unitPrice: "R4.79 / unit", image: "https://placehold.co/300x300/eef2f6/F7B733?text=Noodles+Bulk", badge: { type: "bulk", text: "Bulk Save" } },
    { id: 11, name: "Heavy Duty Yard Broom", size: null, category: "Household", price: 85.00, unitPrice: null, image: "images/broom.jpg", badge: null },
    { id: 12, name: "Microfiber Cloths (5 Pack)", size: null, category: "Cleaning", price: 45.00, unitPrice: "R9.00 / unit", image: "https://placehold.co/300x300/eef2f6/0E7A5F?text=Cloths", badge: null },
    { id: 13, name: "Disposable Coffee Cups (50)", size: null, category: "Office / B2B", price: 65.00, unitPrice: "R1.30 / cup", image: "https://placehold.co/300x300/eef2f6/888?text=Paper+Cups", badge: { type: "bulk", text: "Office" } },
    { id: 14, name: "Cordless Kettle (1.7L)", size: null, category: "Appliances", price: 229.00, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/333?text=Kettle", badge: null },
    { id: 15, name: "Dry Comfort Diapers (Size 3)", size: null, category: "Baby", price: 160.00, unitPrice: "R2.60 / unit", image: "https://placehold.co/300x300/eef2f6/F7B733?text=Diapers", badge: null },
    { id: 16, name: "Extension Cord (5m)", size: null, category: "Hardware", price: 79.00, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/333?text=Cord", badge: null },
    { id: 17, name: "Stainless Steel Pot (Medium)", size: null, category: "Kitchenware", price: 189.00, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/555?text=Pot", badge: null },
    { id: 18, name: "White Bowl", size: null, category: "Kitchenware", price: 49.00, unitPrice: null, image: "images/bowl (1).jpg", badge: null },
    { id: 19, name: "Carpet (2x3m)", size: null, category: "Household", price: 399.00, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/CCC?text=Carpet", badge: null },
    { id: 20, name: "Cookware Set (5 Pieces)", size: null, category: "Kitchenware", price: 599.00, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/AAA?text=Cookware+Set", badge: { type: "hot", text: "Hot" } },
    { id: 21, name: "Laundry Detergent (2kg)", size: null, category: "Cleaning", price: 120.00, unitPrice: "R60 / kg", image: "https://placehold.co/300x300/eef2f6/F7B733?text=Laundry+Detergent", badge: null },
    { id: 22, name: "Iron (Steam)", size: null, category: "Appliances", price: 349.00, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/333?text=Iron", badge: null },
    { id: 23, name: "Mop", size: null, category: "Cleaning", price: 75.00, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/888?text=Mop", badge: null },
    { id: 24, name: "Pressure Cooker (5L)", size: null, category: "Kitchenware", price: 499.00, unitPrice: null, image: "https://placehold.co/300x300/eef2f6/555?text=Pressure+Cooker", badge: null },
    { id: 25, name: "Highlighter (Pack of 4)", size: null, category: "Office / B2B", price: 35.00, unitPrice: "R8.75 / unit", image: "https://placehold.co/300x300/eef2f6/FF0?text=Highlighter", badge: null },
    { id: 26, name: "Glue Stick", size: null, category: "Office / B2B", price: 15.00, unitPrice: "R15.00 / unit", image: "https://placehold.co/300x300/eef2f6/F0F?text=Glue+Stick", badge: null }
];
