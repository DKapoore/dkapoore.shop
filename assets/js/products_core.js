// Shared Core Logic for all pages
const PRODUCTS_CORE = {
    // Configuration
    config: {
        productsPerPage: 10,
        currentPage: 1,
        currentPageType: 'amazon_deals',
        reelAutoplayDelay: 3000,
        currentReelIndex: 0,
        reelInterval: null
    },

    // Initialize the system
    init: function(pageType) {
        this.config.currentPageType = pageType;
        this.loadProducts();
        this.setupEventListeners();
        this.renderAllViews();
    },

    // Load products from appropriate JSON file
    loadProducts: function() {
        const fileName = this.getFileName();
        const storedProducts = localStorage.getItem(fileName);
        
        if (storedProducts) {
            this.products = JSON.parse(storedProducts);
        } else {
            this.products = [];
            this.saveProducts();
        }
        
        return this.products;
    },

    // Get filename based on page type
    getFileName: function() {
        switch(this.config.currentPageType) {
            case 'amazon_deals': return 'amazon_deals.json';
            case 'ebooks': return 'ebooks.json';
            case 'automation_apps': return 'automation_apps.json';
            default: return 'amazon_deals.json';
        }
    },

    // Save products to appropriate JSON file
    saveProducts: function() {
        const fileName = this.getFileName();
        localStorage.setItem(fileName, JSON.stringify(this.products));
        this.renderAllViews();
    },

    // Setup event listeners
    setupEventListeners: function() {
        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyCategoryFilter());
        }

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.searchProducts());
        }

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link')) {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page) {
                    this.config.currentPage = page;
                    this.renderAllViews();
                }
            }
        });

        // Mobile reel navigation
        const nextReelBtn = document.getElementById('nextReelBtn');
        const prevReelBtn = document.getElementById('prevReelBtn');
        
        if (nextReelBtn) {
            nextReelBtn.addEventListener('click', () => this.nextReel());
        }
        
        if (prevReelBtn) {
            prevReelBtn.addEventListener('click', () => this.prevReel());
        }
    },

    // Render all views (desktop and mobile)
    renderAllViews: function() {
        this.renderDesktopProducts();
        this.renderMobileReelProducts();
        this.renderPagination();
        this.updateCategoryFilter();
    },

    // Render desktop products view
    renderDesktopProducts: function() {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        const filteredProducts = this.getFilteredProducts();
        const paginatedProducts = this.getPaginatedProducts(filteredProducts);

        container.innerHTML = '';

        if (paginatedProducts.length === 0) {
            container.innerHTML = '<div class="no-products">No products found</div>';
            return;
        }

        paginatedProducts.forEach(product => {
            const productCard = this.createProductCard(product);
            container.appendChild(productCard);
        });
    },

    // Render mobile reel products view
    renderMobileReelProducts: function() {
        const container = document.getElementById('mobileReelsContainer');
        if (!container) return;

        const filteredProducts = this.getFilteredProducts();
        const paginatedProducts = this.getPaginatedProducts(filteredProducts);

        container.innerHTML = '';

        if (paginatedProducts.length === 0) {
            container.innerHTML = '<div class="no-products">No products found</div>';
            return;
        }

        paginatedProducts.forEach((product, index) => {
            const reelCard = this.createReelCard(product, index);
            container.appendChild(reelCard);
        });

        // Initialize reel autoplay
        this.initReelAutoplay();
    },

    // Create desktop product card
    createProductCard: function(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">
                <img src="${product.images[0]}" alt="${product.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=Image+Error'">
                ${product.status !== 'active' ? '<div class="status-badge inactive">Inactive</div>' : ''}
                ${product.status === 'hot' ? '<div class="status-badge hot">Hot</div>' : ''}
                ${product.status === 'trending' ? '<div class="status-badge trending">Trending</div>' : ''}
                ${product.status === 'bestseller' ? '<div class="status-badge bestseller">Best Seller</div>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <div class="product-category">${product.category}</div>
                <div class="product-rating">
                    ${this.generateStarRating(product.rating)}
                    <span class="rating-count">(${product.reviews})</span>
                </div>
                <div class="product-price">${product.price}</div>
                <p class="product-description">${product.description}</p>
                <div class="product-actions">
                    <a href="${product.link}" class="buy-button" target="_blank">Buy Now</a>
                </div>
            </div>
        `;
        return card;
    },

    // Create mobile reel card
    createReelCard: function(product, index) {
        const reel = document.createElement('div');
        reel.className = 'reel-card';
        reel.setAttribute('data-reel-index', index);
        reel.innerHTML = `
            <div class="reel-header">
                <div class="reel-category">${product.category}</div>
                ${product.status !== 'active' ? '<div class="status-badge inactive">Inactive</div>' : ''}
                ${product.status === 'hot' ? '<div class="status-badge hot">Hot</div>' : ''}
                ${product.status === 'trending' ? '<div class="status-badge trending">Trending</div>' : ''}
                ${product.status === 'bestseller' ? '<div class="status-badge bestseller">Best Seller</div>' : ''}
            </div>
            <div class="reel-image">
                <img src="${product.images[0]}" alt="${product.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=Image+Error'">
            </div>
            <div class="reel-content">
                <h3 class="reel-title">${product.title}</h3>
                <div class="reel-rating">
                    ${this.generateStarRating(product.rating)}
                    <span class="rating-count">${product.reviews} reviews</span>
                </div>
                <div class="reel-price">${product.price}</div>
                <p class="reel-description">${product.description}</p>
                <div class="reel-actions">
                    <a href="${product.link}" class="reel-button" target="_blank">Buy Now</a>
                </div>
            </div>
        `;
        return reel;
    },

    // Generate star rating HTML
    generateStarRating: function(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        return `<div class="star-rating">${stars}</div>`;
    },

    // Initialize reel autoplay
    initReelAutoplay: function() {
        const reelCards = document.querySelectorAll('.reel-card');
        
        // Clear existing interval
        if (this.config.reelInterval) {
            clearInterval(this.config.reelInterval);
        }

        // Show first reel
        if (reelCards.length > 0) {
            this.showReel(0);
        }

        // Auto advance reels
        this.config.reelInterval = setInterval(() => {
            if (reelCards.length > 0) {
                this.config.currentReelIndex = (this.config.currentReelIndex + 1) % reelCards.length;
                this.showReel(this.config.currentReelIndex);
            }
        }, this.config.reelAutoplayDelay);
    },

    // Show specific reel
    showReel: function(index) {
        const reelCards = document.querySelectorAll('.reel-card');
        reelCards.forEach((reel, i) => {
            reel.style.display = i === index ? 'block' : 'none';
        });
        this.config.currentReelIndex = index;
    },

    // Next reel
    nextReel: function() {
        const reelCards = document.querySelectorAll('.reel-card');
        if (reelCards.length > 0) {
            this.config.currentReelIndex = (this.config.currentReelIndex + 1) % reelCards.length;
            this.showReel(this.config.currentReelIndex);
        }
    },

    // Previous reel
    prevReel: function() {
        const reelCards = document.querySelectorAll('.reel-card');
        if (reelCards.length > 0) {
            this.config.currentReelIndex = (this.config.currentReelIndex - 1 + reelCards.length) % reelCards.length;
            this.showReel(this.config.currentReelIndex);
        }
    },

    // Render pagination
    renderPagination: function() {
        const filteredProducts = this.getFilteredProducts();
        const totalPages = Math.ceil(filteredProducts.length / this.config.productsPerPage);
        
        // Update desktop pagination
        const desktopPagination = document.getElementById('desktopPagination');
        if (desktopPagination) {
            desktopPagination.innerHTML = this.generatePaginationHTML(totalPages);
        }

        // Update mobile pagination
        const mobilePagination = document.getElementById('mobilePagination');
        if (mobilePagination) {
            mobilePagination.innerHTML = this.generatePaginationHTML(totalPages);
        }
    },

    // Generate pagination HTML
    generatePaginationHTML: function(totalPages) {
        if (totalPages <= 1) return '';

        let paginationHTML = '<div class="pagination">';
        
        // Previous button
        if (this.config.currentPage > 1) {
            paginationHTML += `<a href="#" class="page-link" data-page="${this.config.currentPage - 1}">Previous</a>`;
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === this.config.currentPage ? ' active' : '';
            paginationHTML += `<a href="#" class="page-link${activeClass}" data-page="${i}">${i}</a>`;
        }

        // Next button
        if (this.config.currentPage < totalPages) {
            paginationHTML += `<a href="#" class="page-link" data-page="${this.config.currentPage + 1}">Next</a>`;
        }

        paginationHTML += '</div>';
        return paginationHTML;
    },

    // Apply category filter
    applyCategoryFilter: function() {
        this.config.currentPage = 1;
        this.config.currentReelIndex = 0;
        this.renderAllViews();
    },

    // Search products
    searchProducts: function() {
        this.config.currentPage = 1;
        this.config.currentReelIndex = 0;
        this.renderAllViews();
    },

    // Update category filter dropdown
    updateCategoryFilter: function() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;

        const categories = [...new Set(this.products.map(p => p.category).filter(Boolean))];
        
        // Save current selection
        const currentValue = categoryFilter.value;
        
        // Update options
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(category => {
            categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
        });

        // Restore selection
        if (categories.includes(currentValue)) {
            categoryFilter.value = currentValue;
        }
    },

    // Get filtered products based on search and category
    getFilteredProducts: function() {
        let filteredProducts = this.products.filter(p => p.status === 'active');

        // Apply category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && categoryFilter.value) {
            filteredProducts = filteredProducts.filter(p => p.category === categoryFilter.value);
        }

        // Apply search filter
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.title.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm) ||
                (p.searchTerms && p.searchTerms.toLowerCase().includes(searchTerm))
            );
        }

        return filteredProducts;
    },

    // Get paginated products
    getPaginatedProducts: function(products) {
        const startIndex = (this.config.currentPage - 1) * this.config.productsPerPage;
        const endIndex = startIndex + this.config.productsPerPage;
        return products.slice(startIndex, endIndex);
    },

    // Add product (called from admin)
    addProduct: function(productData) {
        const product = {
            id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            ...productData,
            createdAt: new Date().toISOString()
        };

        this.products.unshift(product);
        this.saveProducts();
    },

    // Update product (called from admin)
    updateProduct: function(productId, productData) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...productData };
            this.saveProducts();
        }
    },

    // Delete product (called from admin)
    deleteProduct: function(productId) {
        this.products = this.products.filter(p => p.id !== productId);
        this.saveProducts();
    },

    // Duplicate product (called from admin)
    duplicateProduct: function(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            const duplicatedProduct = {
                ...product,
                id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                title: product.title + ' (Copy)',
                createdAt: new Date().toISOString()
            };
            this.products.unshift(duplicatedProduct);
            this.saveProducts();
        }
    }
};

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    const bodyClass = document.body.className || '';
    let pageType = 'amazon_deals';
    
    if (bodyClass.includes('amazon-deals-page') || window.location.href.includes('amazon_deals')) {
        pageType = 'amazon_deals';
    } else if (bodyClass.includes('ebooks-page') || window.location.href.includes('e_books')) {
        pageType = 'ebooks';
    } else if (bodyClass.includes('automation-apps-page') || window.location.href.includes('automation_apps')) {
        pageType = 'automation_apps';
    }
    
    PRODUCTS_CORE.init(pageType);
});