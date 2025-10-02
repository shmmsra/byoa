#pragma once

#include <string>

class Clipboard {
public:
	// Singleton access method
	static Clipboard& getInstance();

	// Delete copy constructor and assignment operator
	Clipboard(const Clipboard&) = delete;
	Clipboard& operator=(const Clipboard&) = delete;

	//! Returns whether the clipboard contains a string
	bool hasString();
	//! Returns whether the clipboard contains an image
	bool hasImage();

	//! Returns the clipboard contents as a UTF-8 string or an empty string
	// if the clipboard does not contain a string
	std::string getString();

	// Writes a string to the macOS clipboard
	static bool writeText(const std::string& text);

	// Reads a string from the macOS clipboard
	static std::string readText();

	// Clears the clipboard
	static void clear();

private:
	Clipboard() = default;
	~Clipboard() = default;
};
