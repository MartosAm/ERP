# Front ERP Project

This project is an Angular application designed to serve as the frontend for an ERP system. It utilizes Tailwind CSS for styling, Angular Material for UI components, and Axios for HTTP requests. The application is containerized using Docker and served with Nginx as a reverse proxy.

## Project Structure

- **src/app/components/shared**: Contains shared components that can be reused across different parts of the application.
- **src/app/pages**: Contains the main pages of the application, each representing a different route.
- **src/app/services**: Contains services for handling business logic and HTTP requests, including integration with Axios for external service calls.
- **src/app/guards**: Contains route guards that control access to certain routes based on user authentication or other criteria.
- **src/app/interceptors**: Contains HTTP interceptors that can modify requests or responses globally, such as adding authorization headers.
- **src/app/app.config.ts**: Configuration settings for the Angular application, such as environment variables and application-wide constants.
- **src/app/app.routes.ts**: Defines the routing configuration for the application, mapping paths to components.
- **src/assets**: Contains static assets such as images, fonts, and other resources used in the application.
- **src/styles/globals.css**: Global styles for the application, including Tailwind CSS imports and custom styles.
- **src/main.ts**: Entry point of the Angular application. It bootstraps the root module and initializes the application.
- **src/index.html**: Main HTML file that serves as the template for the Angular application.

## Docker Setup

The application is containerized using Docker. The following files are included for Docker setup:

- **docker/Dockerfile**: Instructions for building the Docker image for the Angular application.
- **docker/nginx.conf**: Nginx configuration for serving the Angular application as static files and setting up the reverse proxy.
- **docker-compose.yml**: Defines the services, networks, and volumes for the Docker application, allowing for easy setup and management of the development and production environments.

## Configuration Files

- **angular.json**: Configuration for the Angular CLI, including build options, assets, and styles.
- **tsconfig.json**: Configuration file for TypeScript, specifying compiler options and files to include in the compilation.
- **tailwind.config.js**: Configuration for Tailwind CSS, including custom themes, colors, and other settings.
- **package.json**: Configuration file for npm, listing dependencies, scripts, and metadata for the project.

## Getting Started

1. Clone the repository:
   ```
   git clone <repository-url>
   cd Front_ERP
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the application:
   ```
   ng build
   ```

4. Run the application using Docker:
   ```
   docker-compose up
   ```

5. Access the application at `http://localhost:4200`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.