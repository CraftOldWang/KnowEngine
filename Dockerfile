FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /build/target/know-engine-1.0.0-SNAPSHOT.jar app.jar
ENTRYPOINT ["java", "-Dloader.path=/app/extra", "-cp", "app.jar", "org.springframework.boot.loader.launch.PropertiesLauncher"]
