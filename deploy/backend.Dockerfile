FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY backend/pom.xml backend/pom.xml
COPY backend/src backend/src
RUN mvn -f backend/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 --no-create-home kickoff
WORKDIR /app
COPY --from=build --chown=10001:10001 /workspace/backend/target/kickoff-backend-0.1.0.jar /app/app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "/app/app.jar"]
