#!/bin/bash

 if command -v python > /dev/null; then
    python flash_python.py
elif command -v python3 > /dev/null; then
    python3 flash_python.py
fi