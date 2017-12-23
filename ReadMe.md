#SWBF Web Client*

Attempts to recreate the battlefront client with all original code/art/everything
This client has a goal of connecting to original software servers, while studying them
to recreate the server software also!

See developer instructions for setting up the development environment:
https://github.com/RepComm/swbf_web_client/blob/master/DevelopmentSetupInstructions.txt

Currently implemented things:
-Basic scene and rendering setup
-Non-event based input handling
-Start of a player class that renders a shape and it's name (reused for remote clients
 on client/server, and for local control of our own player as client)
-Separate rendering and update loops that have updates/second control
-Start of master server polling for current server list (almost usable!)

Things will be a little slow until about mid-january.

I'll write more later!