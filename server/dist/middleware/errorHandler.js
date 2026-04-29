"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFound = notFound;
function errorHandler(err, _req, res, _next) {
    console.error(err.stack);
    res.status(500).json({ message: err.message || 'Internal server error', error: err.message });
}
function notFound(_req, res) {
    res.status(404).json({ error: 'Route not found' });
}
