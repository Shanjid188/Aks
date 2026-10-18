@echo off
rem AKS Mart POS print agent — keep this window open (or put a shortcut to this
rem file in the Windows Startup folder) so "Direct Print" works in the admin panel.
title AKS Mart Print Agent
cd /d "%~dp0.."
node scripts\print-agent.mjs
pause
