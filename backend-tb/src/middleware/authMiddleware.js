// File: src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

const verifikasiToken = (req, res, next) => {
    // 1. Cek apakah ada header Authorization
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ 
            success: false, 
            message: 'Akses ditolak. Token tidak disediakan.' 
        });
    }

    // 2. Format standar: "Bearer <token>"
    const token = authHeader.split(' ')[1]; 
    if (!token) {
        return res.status(403).json({ 
            success: false, 
            message: 'Format token tidak valid.' 
        });
    }

    // 3. Verifikasi keaslian token menggunakan JWT_SECRET
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ 
                success: false, 
                message: 'Akses ditolak. Token tidak valid atau sudah kadaluarsa.' 
            });
        }
        
        // Simpan data user (seperti role) ke dalam request agar bisa dipakai di Controller
        req.user = decoded; 
        
        // Lanjutkan perjalanan request ke Controller
        next(); 
    });
};

module.exports = verifikasiToken;