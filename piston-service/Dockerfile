FROM ghcr.io/engineer-man/piston:latest

# The install script is located in the WORKDIR (usually /piston)
RUN ./packages/run-install.sh nodejs 18.15.0
RUN ./packages/run-install.sh python 3.10.0
RUN ./packages/run-install.sh java 15.0.2

EXPOSE 2000