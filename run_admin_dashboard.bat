@echo off
echo Starting Notary Voice Agent Admin Dashboard...
echo.
echo Make sure you've added your database credentials to the .env file!
echo.

REM Check if requirements are installed
pip install -q flask flask-wtf pandas plotly

echo.
echo Starting dashboard on http://localhost:5001
echo.
python admin_dashboard.py
echo.
echo If you see any errors above, please take note of them.
pause 