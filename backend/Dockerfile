# Use Java 17 base image (Render compatible)
FROM eclipse-temurin:17-jdk-jammy

# Install necessary tools for Coral
RUN apt-get update && apt-get install -y curl unzip

# Install Coral CLI (Required for the MCP Server)
RUN sh -c "$(curl -fsSL https://coral.turbot.com/install.sh)"

# Set working directory
WORKDIR /app

# Copy the backend source code
COPY . .

# Ensure Maven wrapper is executable and build the project
RUN chmod +x ./mvnw
RUN ./mvnw clean package -DskipTests

# Expose the port Spring Boot runs on
EXPOSE 8080

# Run the Spring Boot application
CMD ["java", "-jar", "target/demo-0.0.1-SNAPSHOT.jar"]
