const jwt = require("jsonwebtoken");

function createAuthMiddleware(roles = ["user"]) {

    return function authMiddleware(req, res, next) {
        let token = req.cookies?.token;
        if (!token && req.headers?.authorization) {
            token = req.headers.authorization.startsWith("Bearer ")
                ? req.headers.authorization.split(" ")[1]
                : req.headers.authorization;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
        }

        try {
            const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || "default_jwt_secret";
            const decodedToken = jwt.verify(token, secret);

            if (!roles.includes(decodedToken.role)) {
                return res.status(401).json({
                    success: false,
                    message: `Unauthorized: User role '${decodedToken.role}' is not permitted. Required: ${roles.join(" or ")}`
                });
            }

            req.user = decodedToken;
            next();

        } catch (error) {
            if (process.env.NODE_ENV !== "test") {
                console.error("JWT verification failed:", error.message);
            }
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }
    }
}


module.exports = {
    createAuthMiddleware,
}
