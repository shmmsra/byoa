#include "logger.hpp"
#include "app-controller.hpp"

#ifdef _WIN32
int CALLBACK WinMain(HINSTANCE, HINSTANCE, LPSTR, int) {
#else
int main() {
#endif
    Logger::getInstance().init();
    Logger::getInstance().info("Main::start: start");

    AppController::getInstance().init();
    int status = AppController::getInstance().start();

    Logger::getInstance().info("Main::start: end");
    return 0;
}
