#include <spdlog/spdlog.h>
#include <spdlog/sinks/basic_file_sink.h>

#include <saucer/smartview.hpp>
#include "logger.hpp"
#include "app-controller.hpp"

#ifdef _WIN32
int CALLBACK WinMain(HINSTANCE, HINSTANCE, LPSTR, int) {
#else
int main() {
#endif
    Logger::getInstance().info("Main::start: start");

    AppController::getInstance().init();
    int status = AppController::getInstance().start();

    Logger::getInstance().info("Main::start: end");
    return 0;
}
