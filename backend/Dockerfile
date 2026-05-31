# Use Java 17 base image (Render compatible)
FROM eclipse-temurin:17-jdk-jammy

# Install necessary tools for Coral and Maven
RUN apt-get update && apt-get install -y curl unzip maven sudo

# Steampipe/Coral's embedded Postgres database explicitly REFUSES to run as the 'root' user for security reasons!
# We MUST create and use a non-root user to run the application in Docker.
RUN useradd -m -s /bin/bash coraluser

# Install Coral CLI globally as root so it goes into /usr/local/bin
RUN sh -c "$(curl -fsSL https://coral.turbot.com/install.sh)"

# Switch to our non-root user for all following commands
USER coraluser

# Disable telemetry so Coral doesn't prompt for input
ENV CORAL_TELEMETRY=none

# Pre-install the required Coral plugins and warm up the local database engine as the non-root user
RUN coral plugin install github linear sentry sonarqube && coral sql "select 1"

# Set working directory to the user's home folder
WORKDIR /home/coraluser/app

# Copy the backend source code and change ownership to the non-root user
COPY --chown=coraluser:coraluser . .

# Build the project using Maven directly
RUN mvn clean package -DskipTests

# Expose the port Spring Boot runs on
EXPOSE 8080

# Run the Spring Boot application
CMD ["java", "-jar", "target/demo-0.0.1-SNAPSHOT.jar"]
