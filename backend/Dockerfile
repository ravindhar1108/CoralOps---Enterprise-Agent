# Use Java 17 base image (Render compatible)
FROM eclipse-temurin:17-jdk-jammy

# Install necessary tools
RUN apt-get update && apt-get install -y curl unzip maven

# Disable all interactive prompts globally
ENV CI=true
ENV NONINTERACTIVE=1

# Force the install script to put coral in the global system path
ENV CORAL_INSTALL_DIR=/usr/local/bin
RUN curl -fsSL https://withcoral.com/install.sh | sh || true
RUN test -f /usr/local/bin/coral || ln -s /root/.local/bin/coral /usr/local/bin/coral

# Warm up the local database engine during the build phase so it doesn't timeout the Java app
RUN coral sql "select 1"

# Set working directory
WORKDIR /app

# Copy the backend source code
COPY . .

# Build the project using Maven directly
RUN mvn clean package -DskipTests

# Expose the port Spring Boot runs on
EXPOSE 8080

# Run the Spring Boot application with a strict memory limit to leave RAM for Coral
CMD sh -c 'coral sql "select 1" > /dev/null 2>&1 ; java -Xmx200m -jar target/demo-0.0.1-SNAPSHOT.jar'
