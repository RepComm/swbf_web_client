
rem So, editing environment variables + bugs with NWjs make things painful when using %cd% for some systems
rem I personally am only using VSCode to test (because I need the debugger), so this batch is obsolete to me..
rem I might make a launcher that auto-finds nwjs install and the project directory by digging around
rem Oh the joys of inconsistent file systems..

rem PUT YOUR OWN ABSOLUTE DIRECTORY PATH TO NW INSTALL DIRECTORY HERE
cd "C:/Program Files/nwjs"

rem PUT YOUR OWN ABSOLUTE PATH TO PROJECT DIRECTORY HERE
start nw.exe C:/Users/Jonathan/Desktop/Projects/swbf_web_client
@pause