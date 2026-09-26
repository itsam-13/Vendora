const jwt = require('jsonwebtoken');

async function authMiddleware(req, res, next) {
    let token = req.cookies && req.cookies.token;
    if (!token && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || 'default_jwt_secret');

        // JWT payload shape: { id, username, email, role }
        if (!decoded || !decoded.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

module.exports = { authMiddleware };