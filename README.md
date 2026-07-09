# blog-church
Blog for my church. Uses Flask and Python for the back-end.

## Motivation

This blog was created to provide a centralized platform for sharing articles, announcements, and spiritual writings within the Orthodox community served by the Metropolis of Denver. It aims to foster connection while maintaining a structured publishing flow managed by designated administrators.

## Quick Start

Follow these steps to get the project running locally.

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd blog-church
   ```
2. Set up environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```
3. Initialize the database (run migrations):
   ```bash
   flask db init
   flask db migrate
   flask db upgrade
   ```
4. Run the application:
   ```bash
   flask run
   ```


## Usage

**General Users:**
Navigate to the homepage or visit the About page. New users can register, and existing members can log in to view content.

**Writers:**
Authenticated writers can access their dashboard (`/users/writers`) to compose new articles. Articles must be uploaded as DOCX or PDF files for conversion into rich HTML content. After composition, submitting the article sends it to admin review.

**Administrators:**
Admins manage all site permissions and content flow via the Admin Dashboard (`/users/admin`):
*   Manage user roles (Admin, Writer).
*   Review and Approve pending articles submitted by writers.
*   Edit or reject any published article.


## Contributing

We welcome contributions! Please feel free to check out the code and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.