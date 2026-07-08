# ---------- Eureka discovery server ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8761
# Use shell form so $JAVA_OPTS from docker-compose is respected
ENTRYPOINT exec java ${JAVA_OPTS} -XX:+UseContainerSupport -jar app.jar
