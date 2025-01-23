# 🏨 Hostel Management System - Server

This is the backend server for the **Hostel Management System** project, built using **Node.js**, **Express.js**, and **MongoDB**. It provides APIs for managing users, meals, and reviews, along with authentication and admin functionalities.

---

## 🚀 Features

1. 🔒 **JWT Authentication** for secure login and user sessions.
2. 🍽️ **Meal Management APIs** for adding, editing, and deleting meals.
3. ⭐ **Review Management** allows students to review meals and manage their reviews.
4. 📊 **Admin Panel** to efficiently manage students, meals, and reviews.
5. 🌐 **CORS Enabled** for secure cross-origin API access.
6. 🛡️ **Authentication Middleware** to protect private routes.
7. 📈 Optimized API responses for fast and reliable performance.
8. 📦 Modular and scalable codebase for easy maintenance and updates.
9. 🗄️ **MongoDB Integration** for secure and flexible data storage.
10. 📢 Sweet Alerts for user notifications on successful actions.

---

## 🌐 API Endpoints

- **Authentication:**
  - `POST /api/login` - Log in users.
  - `POST /api/register` - Register a new user.

- **Meal Management:**
  - `GET /api/meals` - Fetch all meals.
  - `POST /api/meals` - Add a new meal (Admin only).
  - `PUT /api/meals/:id` - Update a meal (Admin only).
  - `DELETE /api/meals/:id` - Delete a meal (Admin only).

- **Review Management:**
  - `POST /api/reviews` - Add a new review.
  - `GET /api/reviews` - Get all reviews for a meal.
  - `DELETE /api/reviews/:id` - Delete a review.

- **Admin Panel:**
  - `GET /api/admin/students` - Manage student accounts.
  - `POST /api/admin/meals` - Admin meal management.

---

## 🔑 Admin Credentials
- **👤 Username**: `admin123`  
- **🔑 Password**: `password123`
