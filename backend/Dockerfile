# Use Ubuntu 24.04 which has GLIBC 2.39 (Required by Coral CLI v0.4.1)
FROM ubuntu:24.04

# Disable interactive prompts for apt-get
ENV DEBIAN_FRONTEND=noninteractive
ENV CI=true
ENV NONINTERACTIVE=1

# Install Java 17, Maven, and required tools
RUN apt-get update && apt-get install -y openjdk-17-jdk curl unzip maven

# Force the install script to put coral in the global system path
ENV CORAL_INSTALL_DIR=/usr/local/bin
RUN curl -fsSL https://withcoral.com/install.sh | sh || true
RUN test -f /usr/local/bin/coral || ln -s /root/.local/bin/coral /usr/local/bin/coral

# Warm up the local database engine during the build phase
RUN coral sql "select 1"

# Set working directory
WORKDIR /app

# Copy the backend source code
COPY . .

# Build the project using Maven directly
RUN mvn clean package -DskipTests

# Expose the port Spring Boot runs on
EXPOSE 8080

# Run the Spring Boot application with a strict memory limit
CMD ["java", "-Xmx200m", "-jar", "target/demo-0.0.1-SNAPSHOT.jar"]
