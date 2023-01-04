## User management service code for Nelson
* This code contains the user management service code that will be deployed to lambda functions
* To run this code as proxy to actual lambda function, run the following commands
<code>
npm install
<br>npm run remote
</code>
* To run this code as proxy with local function, run the following commands
<code>
npm install
<br>ACCESSKEY=AKIAXXXXXXXXXXXXXXXX SECRETKEY=XXXXX npm run local
</code>
Note: Make sure the environment variables are updated to the correct values in package.json before running the commands

## Disable cors on chrome
When accessing the api through proxy, you may run into cors issues. Follow steps below to overcome
* Run chrome with flag --disable-web-security
* Follow https://stackoverflow.com/questions/3102819/disable-same-origin-policy-in-chrome for more info
* Command for windows: ```chrome.exe --user-data-dir="C://Chrome dev session" --disable-web-security```
* Command for mac: ```open -na Google\ Chrome --args --user-data-dir=/tmp/temporary-chrome-profile-dir --disable-web-security``` or ```open /Applications/Google\ Chrome.app --args --user-data-dir="/var/tmp/Chrome dev session" --disable-web-security``` 

## TODO: Structure this project for CI/CD to the user management AWS deployments