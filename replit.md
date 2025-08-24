# Inmate Mail Service

## Overview

This is a full-stack web application that provides a digital mail service for sending letters to incarcerated individuals. Users can compose letters online, and the service handles printing and physical delivery to correctional facilities. The application features subscription-based pricing, content moderation, administrative oversight, and print-ready PDF generation.

## Recent Updates (August 2025)

- **PDF Generation System**: Added complete PDF generation with print-ready formatting for 8.5x11 paper
- **Letter Preview**: Users can preview formatted letters before submission in both compose and dashboard views
- **Free Pay-Per-Letter**: Changed pay-per-letter pricing to $0.00 for testing email notification functionality
- **Email Notifications**: Fully functional Gmail SMTP integration with admin alerts and user confirmations
- **Terms of Service & Privacy Policy**: Added required checkbox acceptance at checkout and subscription signup with dedicated legal pages

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Payment Processing**: Stripe integration for subscriptions and one-time payments

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect and Passport.js
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with structured error handling

### Database Design
- **Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations
- **Core Tables**:
  - Users: Profile information, subscription status, and admin flags
  - Letters: Content, recipient details, delivery status, and timestamps
  - Content Filters: Moderation flags and review requirements
  - Sessions: Required for Replit Auth integration

### Authentication & Authorization
- **Identity Provider**: Replit Auth with OIDC discovery
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role-Based Access**: Admin flag for administrative functions
- **Security**: HTTP-only cookies with secure flags for production

### Content Moderation System
- **Comprehensive Filtering**: Advanced pattern detection covering all correctional facility requirements
- **Risk Categories**: 
  - High-risk: Sexual content, violence, weapons, drugs, escape plans, coded messages
  - Medium-risk: Derogatory language, inmate/staff mentions, contact information, suspicious patterns
  - Low-risk: Excessive legal discussion, general emotional content
- **Pattern Detection**: URL/QR codes, encrypted messages, excessive capitalization, suspicious formatting
- **Review Workflow**: Detailed admin interface showing exact flagging reasons and content analysis
- **Compliance Standards**: Meets correctional facility requirements for mail screening

### Payment Integration
- **Provider**: Stripe for payment processing with full integration
- **Subscription Model**: $9.99/month for 4 letters with automatic billing
- **Pay-per-letter**: $3.99 per single letter with one-time checkout (currently FREE for testing)
- **Dynamic Pricing**: Uses Stripe's price_data for flexible product creation
- **Webhooks**: Automated subscription status updates and payment confirmations
- **Customer Management**: Automatic Stripe customer creation and linking
- **Checkout Flow**: Hosted Stripe checkout with success/cancel redirects
- **Legal Compliance**: Required Terms of Service and Privacy Policy acceptance before payment

### Development Tooling
- **Build System**: Vite for frontend, esbuild for backend bundling
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Development**: Hot module replacement and runtime error overlays
- **Path Aliases**: Simplified imports with @ prefixes for better organization

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Stripe**: Payment processing and subscription management
- **Replit Auth**: Authentication and user management
- **Gmail SMTP**: Email notifications for new letters and status updates

### Key Libraries
- **Frontend**: React, TanStack Query, React Hook Form, Radix UI, Tailwind CSS
- **Backend**: Express.js, Drizzle ORM, Passport.js, Stripe SDK, jsPDF for PDF generation
- **Shared**: Zod for validation, date-fns for date handling

### PDF Generation System
- **Compliance-Ready Formatting**: Professional letter format meeting correctional facility requirements
- **Standard Paper Size**: 8.5x11 inch letter format with proper margins and spacing
- **Complete Layout**: Sender info (top-left), recipient info (top-right), date, subject, body with paragraph indentation, signature line
- **Multi-page Support**: Automatic page breaks for longer letters with consistent formatting
- **Preview Functionality**: HTML preview matching PDF layout for user validation before submission
- **Download Options**: Direct PDF download from dashboard and admin panel

### Development Dependencies
- **TypeScript**: Type safety across the stack
- **Vite**: Frontend build tooling and development server
- **ESBuild**: Backend bundling for production
- **Tailwind CSS**: Utility-first styling framework