# Use Java 17 base image (Render compatible)
FROM eclipse-temurin:17-jdk-jammy

# Install necessary tools
RUN apt-get update && apt-get install -y curl unzip maven

# Install the official Coral CLI
RUN curl -fsSL https://withcoral.com/install.sh | sh

# Set working directory
WORKDIR /app

# Copy the backend source code
COPY . .

# Build the project using Maven directly
RUN mvn clean package -DskipTests

# Expose the port Spring Boot runs on
EXPOSE 8080

# Run the Spring Boot application
CMD ["java", "-jar", "target/demo-0.0.1-SNAPSHOT.jar"]
