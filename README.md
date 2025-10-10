# QuiKart: A Ghanaian Mobile E-commerce Simulation

QuiKart is a mobile-first e-commerce web application designed to simulate a vibrant online shopping experience in Ghana. It focuses on providing a clean, user-friendly interface for customers and a straightforward management system for administrators.

Built with a modern tech stack including **Next.js**, **React**, **Tailwind CSS**, and **ShadCN UI**, QuiKart is a lightweight and responsive solution for a simulated online retail environment. It features AI-powered validation for its unique Mobile Money payment simulator.

---

## Core Features & Functionalities

The platform is designed with two primary user roles: customers and administrators.

### I. Customer Experience

This is the main storefront where users can browse and "purchase" products using a simulated payment system.

1.  **Authentication:**
    *   Users can sign up and log into their accounts.

2.  **Product Discovery:**
    *   **Visually Appealing Browsing:** Browse products organized by category, with a layout optimized for mobile devices.
    *   **Product Details:** View detailed product pages with images, descriptions, and pricing in Ghanaian Cedi (GH₵).

3.  **Simulated Ordering:**
    *   **Mobile Money Payment Simulation:** A core feature that simulates payments via major Ghanaian mobile money providers (MTN MoMo, Vodafone Cash, Telecel Cash) and Cash on Delivery.
    *   **AI-Powered Validation:** An integrated AI tool validates user input during the payment simulation to prevent erroneous status updates and provide a more realistic interaction.
    *   **Order Status Updates:** The app reflects the status of the simulated payment (e.g., Pending, Successful, Failed).
    *   **Order History:** Users can view a history of their past orders, including details like the order date, items purchased, and final status.

4.  **Profile Management:**
    *   Users can update their personal profile information and manage their primary delivery address.

### II. Admin Experience

A secure area for administrators to manage the platform's content and view key metrics.

1.  **Role-Based Redirection:**
    *   Upon login, users with an 'admin' role are automatically redirected to a dedicated admin dashboard.

2.  **Admin Dashboard:**
    *   Admins have access to a dashboard displaying basic platform statistics.

3.  **Content Management:**
    *   **Product Management:** Admins can add, edit, and delete products and their categories.
    *   **Pricing Control:** All product prices are managed in Ghanaian Cedi (GH₵).

---

## Style Guidelines

The app's design aims to reflect the energy and vibrancy of Ghanaian markets while ensuring a clean and modern user experience.

*   **Primary Color:** Vibrant orange (`#FF9500`)
*   **Background Color:** Light beige (`#F5F5DC`)
*   **Accent Color:** Soft yellow (`#FAF089`)
*   **Typography & Icons:** Clear, readable fonts and simple, intuitive icons are used to ensure ease of use, especially on mobile devices.
*   **Design Philosophy:** A mobile-first, responsive design is prioritized to provide a consistent and enjoyable experience across all screen sizes.

---

## Technical Stack

*   **Framework:** Next.js (App Router)
*   **Frontend:** React, TypeScript
*   **Styling:** Tailwind CSS
*   **UI Components:** ShadCN UI
*   **Generative AI:** Genkit (for payment simulation validation)
