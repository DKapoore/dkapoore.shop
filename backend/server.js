// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const mysql = require('mysql2/promise'); // or any other database driver

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.307222542930-g216lfrg872u7mpc62mmeq1t85jm5c9v.apps.googleusercontent.com);

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Middleware
app.use(express.json());

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Google authentication endpoint
app.post('/auth/google', async (req, res) => {
    try {
        const { id_token } = req.body;
        
        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: process.env.307222542930-g216lfrg872u7mpc62mmeq1t85jm5c9v.apps.googleusercontent.com
        });
        
        const payload = ticket.getPayload();
        const { sub: googleId, name, email, picture } = payload;
        
        // Check if user exists in database
        const [users] = await db.execute(
            'SELECT * FROM users WHERE google_id = ?',
            [googleId]
        );
        
        let user;
        
        if (users.length === 0) {
            // Create new user
            const [result] = await db.execute(
                'INSERT INTO users (google_id, name, email, picture, created_at) VALUES (?, ?, ?, ?, NOW())',
                [googleId, name, email, picture]
            );
            
            user = {
                id: result.insertId,
                google_id: googleId,
                name,
                email,
                picture
            };
        } else {
            user = users[0];
        }
        
        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                picture: user.picture
            },
            jwt: token
        });
        
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
});

// JWT verification endpoint
app.get('/auth/verify', authenticateToken, async (req, res) => {
    try {
        // Get user from database
        const [users] = await db.execute(
            'SELECT id, name, email, picture FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: users[0]
        });
        
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Checkout endpoint
app.post('/checkout', authenticateToken, async (req, res) => {
    try {
        const { cart, paymentMethod, paymentDetails } = req.body;
        const userId = req.user.id;
        
        // Calculate total amount
        const totalAmount = cart.reduce((total, item) => {
            const price = parseInt(item.price.replace('Rs ', '').replace(',', ''));
            return total + (price * item.quantity);
        }, 0);
        
        // Process payment (this would integrate with a payment gateway like Stripe, Razorpay, etc.)
        const paymentResult = await processPayment(totalAmount, paymentMethod, paymentDetails);
        
        if (!paymentResult.success) {
            return res.status(400).json({
                success: false,
                message: paymentResult.message
            });
        }
        
        // Create order in database
        const [orderResult] = await db.execute(
            'INSERT INTO orders (user_id, total_amount, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, NOW())',
            [userId, totalAmount, paymentMethod, 'completed']
        );
        
        const orderId = orderResult.insertId;
        
        // Add order items
        for (const item of cart) {
            const price = parseInt(item.price.replace('Rs ', '').replace(',', ''));
            
            await db.execute(
                'INSERT INTO order_items (order_id, product_title, product_price, quantity) VALUES (?, ?, ?, ?)',
                [orderId, item.title, price, item.quantity]
            );
        }
        
        res.json({
            success: true,
            orderId: orderId,
            message: 'Order placed successfully'
        });
        
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during checkout'
        });
    }
});

// Mock payment processing function
async function processPayment(amount, method, details) {
    // In a real implementation, this would integrate with a payment gateway
    // For demo purposes, we'll simulate a successful payment
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                success: true,
                transactionId: 'txn_' + Math.random().toString(36).substr(2, 9)
            });
        }, 1000);
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});