## User management service code for Nelson
* This code contains the user management service code that will be deployed to lambda functions
* To run this code as proxy to actual lambda function, run the following commands
<code>
<br>npm install
<br>npm run remote
</code>
* To run this code as proxy with local function, run the following commands
<code>
<br>npm install
<br>ACCESSKEY=AKIAXXXXXXXXXXXXXXXX SECRETKEY=XXXXX npm run local
<br>
</code>
Note: Make sure the environment variables are updated to the correct values in package.json before running the commands

Alternately, to debug the code on vscode, a vs launch.json has been included. Update the AWS credentials and any other environment variables as required to use this.

The postman test set has been included in the source folder

## Disable cors on chrome
When accessing the api through proxy, you may run into cors issues. Follow steps below to overcome
* Run chrome with flag --disable-web-security
* Follow https://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome for more info
* Command for windows: ```chrome.exe --user-data-dir="C://Chrome dev session" --disable-web-security```
* Command for mac: ```open -na Google\ Chrome --args --user-data-dir=/tmp/temporary-chrome-profile-dir --disable-web-security``` or ```open /Applications/Google\ Chrome.app --args --user-data-dir="/var/tmp/Chrome dev session" --disable-web-security``` 