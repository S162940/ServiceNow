var TargetProcessLibrary = Class.create();
TargetProcessLibrary.prototype = {
    initialize: function() {
        this.libs = new PPBLibrary();

        this.aDebug       = [];
        this.sPostHeaders = {"Content-Type":"application/json","Accept":"application/json"};

        // workflow components
        this.sSupportGroup = gs.getProperty('PPB.workflow.TargetProcess.SupportGroup', 'Service Now Support');
        //
        this.bActive       = gs.getProperty('PPB.integration.TargetProcess.active', 'true');

        this.bDebug       = gs.getProperty('PPB.integration.TargetProcess.debug.active', 'true');
        this.sDebug       = gs.getProperty('PPB.integration.TargetProcess.debug.prefix', 'TPDebug');

        this.sProdTarget  = gs.getProperty('PPB.integration.TargetProcess.ProdTarget', 'ppbtest');

        this.nTPApiRetry  = gs.getProperty('PPB.integration.TargetProcess.ApiRetry', 3);
        this.nTPApiSleeps = gs.getProperty('PPB.integration.TargetProcess.ApiSleep', 5000);
        this.sTarget      = gs.getProperty('PPB.integration.TargetProcess.Instances', '');
        this.sMidServer   = gs.getProperty('PPB.integration.TargetProcess.MIDServer', '');
        this.sPPUser      = gs.getProperty('PPB.integration.TargetProcess.PPUserAccount', '');
        this.sSystemName  = gs.getProperty('PPB.integration.TargetProcess.SystemName', 'TargetProcess');
        this.nTakeLimit   = gs.getProperty('PPB.integration.TargetProcess.TakeLimit', 100000);
        this.nTimeout     = gs.getProperty('PPB.integration.TargetProcess.TransactionTimeout', 120000);

        this.sUserCreate  = gs.getProperty('PPB.integration.TargetProcess.User.Create', '{"ResourceType":"User","Kind":"User","FirstName":${FirstName},"LastName":${LastName},"Email":${Email},"Login":${Login},"IsActive":${IsActive},"IsAdministrator":${IsAdministrator},"WeeklyAvailableHours":${WeeklyAvailableHours},"IsObserver":true,"Locale":null,"Skills":null,"ActiveDirectoryName":${ActiveDirectoryName},"Password":${Password},"Role":{"Id":${RoleId},"Name":${RoleName}},"CustomFields":[{"Name":"Business Unit","Type":"DropDown","Value":${Business Unit}},{"Name":"Job Title","Type":"Text","Value":${Job Title}},{"Name":"Line Manager","Type":"Text","Value":${Line Manager}},{"Name":"SID","Type":"Text","Value":${SID}},{"Name":"Location","Type":"DropDown","Value":${Location}}]}');
        this.sUserUpdate  = gs.getProperty('PPB.integration.TargetProcess.User.Update', '{"ResourceType":"User","Kind":"User","Id":${Id},"FirstName":${FirstName},"LastName":${LastName},"Email":${Email},"Login":${Login},"IsActive":${IsActive},"IsAdministrator":${IsAdministrator},"WeeklyAvailableHours":${WeeklyAvailableHours},"IsObserver":true,"Locale":null,"Skills":null,"ActiveDirectoryName":${ActiveDirectoryName},"Role":{"Id":${RoleId},"Name":${RoleName}},"CustomFields":[{"Name":"Business Unit","Type":"DropDown","Value":${Business Unit}},{"Name":"Job Title","Type":"Text","Value":${Job Title}},{"Name":"Line Manager","Type":"Text","Value":${Line Manager}},{"Name":"SID","Type":"Text","Value":${SID}},{"Name":"Location","Type":"DropDown","Value":${Location}}]}');
        this.sUserDisable = gs.getProperty('PPB.integration.TargetProcess.User.Disable', '{"ResourceType":"User","Kind":"User","Id":${SaId},"IsActive":true}');

        this.sUserStoryCreate = gs.getProperty('PPB.integration.TargetProcess.UserStory.Create', '{"ResourceType":"UserStory","Name":${UserStoryName},"Description":${UserStoryDescription},"PlannedStartDate":${UserStoryPlannedStartDate},"PlannedEndDate":${UserStoryPlannedEndDate},"EntityType":{"Id":4,"Name":"UserStory"},"Project":${UserStoryProject},"Owner":${UserStoryOwner},"Team":${UserStoryTeam},"Priority":{"Id":5,"Name":"Nice To Have","Importance":5},"EntityState":${EntityState},"Feature":${UserStoryFeature},"CustomFields":[{"Name":"ServiceNow Task","Type":"URL","Value":{"Url":${UserStoryCustomSNTaskUrl},"Label":${UserStoryCustomSNTaskNumber}}},{"Name":"Security Review","Type":"CheckBox","Value":${UserStoryCustomSecurityReview}},{"Name":"Blocked Reason","Type":"Text","Value":${UserStoryCustomBlockedReason}},{"Name":"Compliance Requested","Type":"Date","Value":${UserStoryCustomComplianceRequested}},{"Name":"Compliance Approved","Type":"Date","Value":${UserStoryCustomComplianceApproved}},{"Name":"Compliance Expired","Type":"Date","Value":${UserStoryCustomComplianceExpired}}]}');
    },
    //*********************************************************************************************
    // User management commands
    //*********************************************************************************************
    runUserCommand : function(inRecord, inOperation) {
        var sFunctionName = 'runUserCommand';
        var output = '';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting : [' + inOperation + ']');
        if ( this.bActive == 'true' || this.bActive == true ) {
            this.aDebug.push(this._prefix(sFunctionName) + ' : TargetProcess integration is enabled');
            var aInstance, sFunction;
            switch ( inOperation ) {
                case 'userStory' :
                    sFunction = 'createUserStory';
                    break;

                case 'getUserStory' :
                    sFunction = 'getUserStory';
                    break;

                case 'create' :
                    sFunction = 'createUser';
                    break;

                case 'update' :
                    sFunction = 'updateUser';
                    break;

                case 'disable' :
                    sFunction = 'disableUser';
                    break;

                case 'list' :
                    sFunction = 'queryUsers';
                    break;

                case 'query' :
                    sFunction = 'queryUser';
                    break;

                case 'roles' :
                    sFunction = 'getRoles';
                    break;

                case 'fields' :
                    sFunction = 'getFields';
                    break;

                case 'teams' :
                    sFunction = 'getTeams';
                    break;

                case 'projects' :
                    sFunction = 'getProjects';
                    break;

                case 'CatalogTask' :
                    sFunction = 'createCatalogTask';
                    this.aDebug.push(this._prefix(sFunctionName) + ' : sFunction : ' + sFunction);
                    break;

                default :
                    output = 'ERROR: invalid operation used';
                    break;
            }
            this.aDebug.push(this._prefix(sFunctionName) + ' : ------------------------------------------------------------------------------------------------------------------------------');
            if ( JSUtil.nil(output) ) {
                if ( this.sTarget.indexOf(',') > 0 ) {
                    var aTarget = this.sTarget.split(',');
                    for ( var i = 0; i < aTarget.length; i++ ) {
                        aInstance = aTarget[i].split('|');
                        this.aDebug.push(this._prefix(sFunctionName) + ' : [' + inOperation + '][' + aInstance[0] + '][' + aInstance[1] + ']');
                        this[sFunction](inRecord, aInstance[0], aInstance[1]);
                        this.aDebug.push(this._prefix(sFunctionName) + ' : ------------------------------------------------------------------------------------------------------------------------------');
                    }
                } else {
                    aInstance = this.sTarget.split('|');
                    this.aDebug.push(this._prefix(sFunctionName) + ' : [' + inOperation + '][' + aInstance[0] + '][' + aInstance[1] + ']');
                    this[sFunction](inRecord, aInstance[0], aInstance[1]);
                }
            }
        } else {
            this.aDebug.push(this._prefix(sFunctionName) + ' : TargetProcess integration is disabled');
            output = 'TargetProcess integration is disabled';
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
        this.aDebug.push(this._prefix(sFunctionName) + ' : ==============================================================================================================================');
        return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    getUserStory : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'getUserStory';
        if ( inTarget == this.sProdTarget ) {
            var oResult = this._checkTrigger(glider, sActionName);
            if ( oResult.Result == true ) {
                this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');
                this.aDebug.push(this._prefix(sFunctionName) + ' : - [' + inTarget + '][' + inSecKey + ']');

                this.aDebug.push(this._prefix(sFunctionName) + ' : Processing user story');

                var sTargetUrl = "https://ppb.tpondemand.com/api/V1/Userstories/" + parseInt(inRecord.u_task_id) + "?access_token=" + inSecKey + "&resultFormat=json";
                this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

                var sMethod = 'post';
                this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

                var sPayload = this._processMacros('u_operational_readiness_checklist_answer', inRecord, this.sUserStoryCreate, 'create', oResult.MapObject.sys_id);
                this.aDebug.push(this._prefix(sFunctionName) + ' : Payload : ' + sPayload);

                oResult = this._poster(sTargetUrl, sMethod, sPayload, this.nTimeout, this.sMidServer, this.sPostHeaders);
                if ( parseInt(oResult.ResponseCode) == 201 ) {
                    var json = JSON.parse(oResult.ResponseBody);
                    var sTPEndeDate       = json.EndDate;
                    if ( sTPEndeDate.indexOf('(') >= 0 ) {
                        var aTPEndDate       = sTPEndDate.split('(');
                        aTPEndDate           = aTPEndDate[1].split(')');
                        sTPEndDate           = this._setOriginTime(parseInt(aTPEndDate[0]), 1);
                        inRecord.u_task_completed = sTPEndDate;
                    }
                } else {
                    this.aDebug.push(this._prefix(sFunctionName) + ' : ' + oResult.ResponseBody);
                }
            }
            inRecord.update();
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    triggerUserStoryCreate : function(inRecord, inAction) {
        this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : Starting');
        var bTrigger = false;
        var jOutput = {"result":"error","mappid":"","message":""};
        var sEncodedQuery = 'u_active=true^u_table=' + inRecord.getTableName() + '^u_target_type=UserStory';
        this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : Encoded query : [' + sEncodedQuery + ']');
        var glider = new GlideRecord('u_targetprocess_team_mapping');
        glider.addEncodedQuery(sEncodedQuery);
        glider.orderBy('u_processing_order');
        glider.orderBy('u_trigger_condition');
        glider.query();
        if ( glider.hasNext() ) {
            this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : Record matches found');
            while ( glider.next() ) {
                this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : Processing record : [' + glider.getDisplayValue() + ']');
                switch ( inAction.toString() ) {
                    case 'insert' :
                        if ( glider.u_on_insert + '' == 'true' ) { bTrigger = true; }
                        break;
                    case 'update' :
                        if ( glider.u_on_update + '' == 'true' ) { bTrigger = true; }
                        break;
                    case 'action' :
                        if ( glider.u_on_action + '' == 'true' ) { bTrigger = true; }
                        break;
                    default :
                        break;
                }
                this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : Trigger response set to : [' + bTrigger + ']');
                if ( bTrigger == true ) {
                    this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : Checking conditions : ' + glider.u_trigger_condition);
                    if ( GlideFilter.checkRecord(inRecord, glider.u_trigger_condition) ) {
                        this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : Condition matched');

                        var sTableName = inRecord.getTableName();
                        var aMessage   = [];
                        aMessage.push(glider.u_number + ' : -- Table name : ' + sTableName);
                        aMessage.push(glider.u_number + ' : -- Task       : ' + inRecord.getDisplayValue());
                        aMessage.push(glider.u_number + ' : -- Action     : ' + inAction);
                        aMessage.push(glider.u_number + ' : -- Mapping ID : ' + glider.sys_id);

                        var sTargetUrl   = glider.u_target_account.u_target_address.toString();
                        var sAccessToken = glider.u_target_account.u_access_token.toString();
                        var sMidServer   = glider.u_target_account.u_use_mid_server.getDisplayValue().toString();
                        aMessage.push(glider.u_number + ' : -- Target URL : ' + sTargetUrl + sAccessToken);
                        aMessage.push(glider.u_number + ' : -- MID server : ' + sMidServer);

                        var sPayload = this.sUserStoryCreate;
                        if ( JSUtil.notNil(glider.u_message_payload) ) { sPayload = glider.u_message_payload; }
                        aMessage.push(glider.u_number + ' : -- Raw payload : ' + sPayload);

                        sPayload = this._processMacros(sTableName, inRecord, sPayload, inAction, glider.sys_id.toString());
                        aMessage.push(glider.u_number + ' : -- Processed payload : ' + sPayload);

                        var oInput  = {"ApiRetry":3,"ApiSleep":5000,"Endpoint":sTargetUrl + sAccessToken,"Headers":this.sPostHeaders,"Method":"post","MidServer":sMidServer,"Payload":sPayload,"Timeout":120000};
                        var oResult = this.libs.ppbPostRESTSync(oInput);

                        if ( parseInt(oResult.ResponseCode) == 201 ) {
                            var json = JSON.parse(oResult.ResponseBody);
                            jOutput.result      = 'success';
                            inRecord.u_task_id   = json.Id;
                            inRecord.u_task_link = "https://" + glider.u_target_system.u_target_address.toString() + ".tpondemand.com/entity/" + json.Id;
                            inRecord.work_notes  = 'Linked task to TargetProcess record ' + json.Id;
                            inRecord.update();
                        } else {
                            jOutput.IncidentId = this._createIncident(inRecord, oResult);
                            inRecord.work_notes = 'Error creating TargetProcess record : ' + oResult.ResponseBody;
                            inRecord.update();
                        }
                        jOutput.Message = aMessage.join('\n');
                    } else {
                        jOutput.result  = 'skipping';
                        jOutput.message = 'no matching condition';
                    }
                } else {
                    jOutput.result  = 'skipping';
                    jOutput.message = 'no matching trigger';
                }
            }
        } else {
            this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : No record matches found');
            jOutput.result  = 'error';
            jOutput.message = 'no matching table definition';
        }
        this.aDebug.push('[' + new Date().getTime() + '][triggerCreateUserStory] : Stopping : ' + JSON.stringify(jOutput));
        this.logger(this.aDebug.join('\n'));
        return jOutput;
    },

    //=============================================================================================
    // Triggered from an SC Task to create a TargetProcess users
    //=============================================================================================
    createUser : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'createUser';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');
        this.aDebug.push(this._prefix(sFunctionName) + ' : - [' + inTarget + '][' + inSecKey + ']');

        var sCallerId = this.sPPUser;
        var sPPUser   = 'no';
        var aComment  = [], sResultMessage = '';
        //if ( sPPUser == 'No' ) { sCallerId = inRecord.request.variable_pool.u_caller_id.sys_id + ''; }
        sCallerId = inRecord.request.variable_pool.u_caller_id.sys_id + '';
        var sSystemAccount = this._getSystemAccess(this.sSystemName + ':' + inTarget, sCallerId);
        //if ( sPPUser == 'Yes' ) { sSystemAccount = 'new'; }

        this.aDebug.push(this._prefix(sFunctionName) + ' : Caller Id      : ' + sCallerId);
        this.aDebug.push(this._prefix(sFunctionName) + ' : PP User        : ' + sPPUser);
        this.aDebug.push(this._prefix(sFunctionName) + ' : System Account : ' + sSystemAccount);

        if ( sSystemAccount == 'new' ) {
            //---------------------------------------------------------------------------------
            // update AD group "TargetProcessCloudAccess"
            //---------------------------------------------------------------------------------
            var oInstance = this.getInstance(this.sSystemName, inTarget);
            if ( JSUtil.notNil(oInstance.u_access_token) ) { inSecKey = oInstance.u_access_token; }
            var sDefaultUser = oInstance.u_default_user;

            var oPSResult = {"Status":"Success","Code":"BF100?","Message":"Primed","output":"Primed","error":"Primed"};
            var bSSOProcess = gs.getProperty('PPB.integration.TargetProcess.User.SSO.Active', 'true');
            this.aDebug.push(this._prefix(sFunctionName) + ' : SSO Active : ' + bSSOProcess);
            if ( bSSOProcess == 'true' ) {
                var sADGroup = oInstance.AdGroup;
                if ( JSUtil.nil(sADGroup) ) { sADGroup = gs.getProperty('PPB.integration.TargetProcess.User.SSO.AdGroup', 'TargetProcessCloudAccess'); }
                this.aDebug.push(this._prefix(sFunctionName) + ' : AD Group : ' + sADGroup);

                var sADUser  = inRecord.request.variable_pool.u_caller_id.user_name;
                this.aDebug.push(this._prefix(sFunctionName) + ' : AD Group : ' + sADUser);
                aComment.push('Adding user ' + sADUser + ' to group ' + sADGroup + ' for TargetProcess SSO.');

                oPSResult = this._postPowerShell('AddUserToGroup', sADGroup, sADUser);
                this.aDebug.push(this._prefix(sFunctionName) + ' : oPSResult.Status  : ' + oPSResult.Status);
                this.aDebug.push(this._prefix(sFunctionName) + ' : oPSResult.Code    : ' + oPSResult.Code);
                this.aDebug.push(this._prefix(sFunctionName) + ' : oPSResult.Message : ' + oPSResult.Message);
                aComment.push(' - PowerShell result  : ' + oPSResult.Status);
                aComment.push(' - PowerShell code    : ' + oPSResult.Code);
                aComment.push(' - PowerShell message : ' + oPSResult.Message);
                aComment.push('');
            }
            //---------------------------------------------------------------------------------

            if ( oPSResult.Status == 'Success' ) {
                var sComment = '';
                this.aDebug.push(this._prefix(sFunctionName) + ' : Running user query');
                var sUserId = this.queryUser(inRecord, inTarget, inSecKey);
                this.aDebug.push(this._prefix(sFunctionName) + ' : --> Query user result : ' + sUserId);
                if ( parseInt(sUserId) == 0 ) {
                    this.aDebug.push(this._prefix(sFunctionName) + ' : Submitting account');
                    var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/Users?access_token=" + inSecKey + "&resultFormat=json";
                    this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

                    var sMethod = 'post';
                    this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

                    var sPayload = this._processMacros('sc_task', inRecord, this.sUserCreate, 'create', '');
                    this.aDebug.push(this._prefix(sFunctionName) + ' : Payload : ' + sPayload);

                    var oResult = this._poster(sTargetUrl, sMethod, sPayload, this.nTimeout, this.sMidServer, this.sPostHeaders);

                    if ( parseInt(oResult.ResponseCode) == 201 ) {
                        var json = JSON.parse(oResult.ResponseBody);
                        var sActive           = true;
                        var sCommissioned     = new GlideDateTime();
                        var sCommissionedBy   = inRecord.request.getDisplayValue() + '';
                        var sUserReference    = parseInt(json.Id) + '';
                        var sUserSysReference = json.Login;
                        aComment.push('Created TargetProcess user id ' + sUserReference + '.');
                        sComment = aComment.join('\n');

                        var oSystemAccess = {"active":sActive,"comment":sComment,"commissioned":sCommissioned,"commissioned_by":sCommissionedBy,"decommissioned":null,"decommissioned_by":null,"expires":null,"system":this.sSystemName + ':' + inTarget,"user":sCallerId,"user_reference":sUserReference,"user_sys_reference":sUserSysReference,"default_user":sDefaultUser};
                        var sSystemAccess = this._impSystemAccess(oSystemAccess);

                        sComment += '  Related record to user in System Access with ' + sSystemAccess;
                        sResultMessage = sComment;
                        this.aDebug.push(this._prefix(sFunctionName) + ' : ' + sResultMessage);
                        inRecord.state = 3;
                        inRecord.active = false;
                    } else {
                        sResultMessage = 'ERROR Creating user account in TargetProcess.\nError from TargetProcess : ' + oResult.ResponseBody;
                        this.aDebug.push(this._prefix(sFunctionName) + ' : ' + sResultMessage);
                    }
                } else {
                    sComment = 'User ' + sUserId + ' created before';
                    sResultMessage = sComment;
                    this.aDebug.push(this._prefix(sFunctionName) + ' : ' + sResultMessage);
                    inRecord.state = 3;
                    inRecord.active = false;
                }
            } else {
                sResultMessage = 'Error updating AD for user SSO access.\nUnable to process TargetProcess user request without SSO access:\n' + aComment.join('\n');
                this.aDebug.push(this._prefix(sFunctionName) + ' : ' + sResultMessage);
            }
        } else {
            sResultMessage = 'ERROR User already has an account';
            this.aDebug.push(this._prefix(sFunctionName) + ' : User already has an account');
        }

        inRecord.comments = sResultMessage;
        inRecord.update();
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //=============================================================================================
    //
    //=============================================================================================
    updateUser : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'updateUser';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');
        this.aDebug.push(this._prefix(sFunctionName) + ' : - [' + inTarget + '][' + inSecKey + ']');

        var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/Users?access_token=" + inSecKey + "&resultFormat=json";
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

        var sMethod = 'post';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

        var sPayload = this._processMacros('sc_task', inRecord, this.sUserUpdate, 'update', '');
        this.aDebug.push(this._prefix(sFunctionName) + ' : Payload : ' + sPayload);

        //var oResult = this._poster(sTargetUrl, sMethod, sPayload, this.nTimeout, this.sMidServer, this.sPostHeaders);

        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //=============================================================================================
    // triggered by a Script Action against the System Access table (u_system_access)
    //=============================================================================================
    disableUser : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'disableUser';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');
        this.aDebug.push(this._prefix(sFunctionName) + ' : - [' + inTarget + '][' + inSecKey + ']');
        var sResult = '';

        var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/Users?access_token=" + inSecKey + "&resultFormat=json";
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

        var sMethod = 'post';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

        var sPayload = this._processMacros('sc_task', inRecord, this.sUserDisable, 'disable', '');
        this.aDebug.push(this._prefix(sFunctionName) + ' : Payload : ' + sPayload);

        var oResult = this._poster(sTargetUrl, sMethod, sPayload, this.nTimeout, this.sMidServer, this.sPostHeaders);
        if ( parseInt(oResult.ResponseCode) == 200 ) {
            sResult = 'Marked inactive in TargetProcess';
            inRecord.u_decommissioned = new GlideDateTime();
            inRecord.u_active = false;
        } else {
            sResult = 'Failed to mark account as inactive in TargetProcess\n' + oResult.ResponseBody;
        }
        inRecord.u_comment = sResult;
        inRecord.update();
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //=============================================================================================
    // inRecord requires a sys_user record
    // returns details of a specfied user record in TargetProcess using an email address
    //=============================================================================================
    queryUser : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'queryUser';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');
        var sTPUserId = 0;
        this.aDebug.push(this._prefix(sFunctionName) + ' : - [' + inTarget + '][' + inSecKey + ']');

        var oInstance = this.getInstance(this.sSystemName, inTarget);
        if ( JSUtil.notNil(oInstance.u_access_token) ) { inSecKey = oInstance.u_access_token; }
        var sDefaultUser = oInstance.u_default_user;

        var sUserEmail = inRecord.request.requested_for.email;
        var sUserId    = inRecord.request.requested_for.sys_id + '';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target email : ' + sUserEmail + ' for user ' + sUserId);
        if ( JSUtil.notNil(sUserEmail) ) {
            var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/Users?access_token=" + inSecKey + "&resultFormat=json&take=" + this.nTakeLimit + "&skip=0&where=Email%20eq%20'" + sUserEmail + "'";
            this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

            var sMethod = 'get';
            this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);
            var sTPUserFirstName, sTPUserLastName, sTPUserEmail, sTPUserLogin, sTPUserIsActive, sTPUserIsAdministrator, sTPUserIsObserver, sTPUserCreateDate, aTPUserCreateDate;

            var oResult = this._poster(sTargetUrl, sMethod, '', this.nTimeout, this.sMidServer, this.sPostHeaders);
            if ( parseInt(oResult.ResponseCode) == 200 ) {
                this.aDebug.push(this._prefix(sFunctionName) + ' : Got a good response');
                var json = JSON.parse(oResult.ResponseBody);
                for ( var i = 0; i < json.Items.length; i++ ) {
                    sTPUserId              = json.Items[i].Id + '';
                    sTPUserFirstName       = json.Items[i].FirstName + '';
                    sTPUserLastName        = json.Items[i].LastName + '';
                    sTPUserEmail           = json.Items[i].Email + '';
                    sTPUserLogin           = json.Items[i].Login + '';
                    sTPUserIsActive        = json.Items[i].IsActive + '';
                    sTPUserIsAdministrator = json.Items[i].IsAdministrator + '';
                    sTPUserIsObserver      = json.Items[i].IsObserver + '';
                    sTPUserCreateDate      = json.Items[i].CreateDate + '';
                    aTPUserCreateDate      = sTPUserCreateDate.split('(');
                    aTPUserCreateDate      = aTPUserCreateDate[1].split(')');
                    sTPUserCreateDate      = this._setOriginTime(parseInt(aTPUserCreateDate[0]), 1);

                    if ( JSUtil.notNil(sTPUserEmail) ) {
                        sUserId = this._getUser(sTPUserEmail);
                        if ( sUserId != 'error' ) {
                            var oSystemAccess = {"active":true,"comment":"","commissioned":sTPUserCreateDate,"commissioned_by":null,"decommissioned":null,"decommissioned_by":null,"expires":null,"system":this.sSystemName + ':' + inTarget,"user":sUserId,"user_reference":sTPUserId,"user_sys_reference":sTPUserEmail,"default_user":sDefaultUser};
                            this._impSystemAccess(oSystemAccess);
                        } else {
                            this.aDebug.push(this._prefix(sFunctionName) + '[' + i + ']:[' + inTarget + ']:[' + sTPUserId + ']:[' + sTPUserFirstName + ']:[' + sTPUserLastName + ']:[' + sTPUserEmail + ']:[' + sTPUserLogin + ']:[' + sTPUserIsActive + ']:[' + sTPUserIsAdministrator + ']:[' + sTPUserIsObserver + '][' + sTPUserCreateDate + ']');
                        }
                    }
                }
            } else {
                this.aDebug.push(this._prefix(sFunctionName) + ' : Got a bad response : ' + oResult.ResponseCode);
            }
        } else {
            this.aDebug.push(this._prefix(sFunctionName) + ' : Skipping, no email address defined for query');
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping.  Returning user id : ' + sTPUserId);

        return sTPUserId;
    },

    //=============================================================================================
    // List all users from TargetProcess.  Use email address to match users to ServiceNow user and link in System Access
    //=============================================================================================
    queryUsers : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'queryUsers';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');
        this.aDebug.push(this._prefix(sFunctionName) + ' : - [' + inTarget + '][' + inSecKey + ']');

        var oInstance = this.getInstance(this.sSystemName, inTarget);
        if ( JSUtil.notNil(oInstance.u_access_token) ) { inSecKey = oInstance.u_access_token; }
        var sDefaultUser = oInstance.u_default_user;
        var sUserId = '';

        var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/Users?access_token=" + inSecKey + "&take=" + this.nTakeLimit + "&skip=0&resultFormat=json";
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

        var sMethod = 'get';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

        var oResult = this._poster(sTargetUrl, sMethod, '', this.nTimeout, this.sMidServer, this.sPostHeaders);
        if ( parseInt(oResult.ResponseCode) == 200 ) {
            var json = JSON.parse(oResult.ResponseBody);
            for ( var i = 0; i < json.Items.length; i++ ) {
                var sTPUserId               = json.Items[i].Id + '';
                var sTPUserFirstName        = json.Items[i].FirstName + '';
                var sTPUserLastName         = json.Items[i].LastName + '';
                var sTPUserEmail            = json.Items[i].Email + '';
                var sTPUserLogin            = json.Items[i].Login + '';
                var sTPUserIsActive         = json.Items[i].IsActive + '';
                var sTPUserIsAdministrator  = json.Items[i].IsAdministrator + '';
                var sTPUserIsObserver       = json.Items[i].IsObserver + '';
                var sTPUserCreateDate       = json.Items[i].CreateDate + '';
                var aTPUserCreateDate       = sTPUserCreateDate.split('(');
                aTPUserCreateDate           = aTPUserCreateDate[1].split(')');
                sTPUserCreateDate           = this._setOriginTime(parseInt(aTPUserCreateDate[0]), 1);

                if ( JSUtil.notNil(sTPUserEmail) ) {
                    sUserId = this._getUser(sTPUserEmail);
                    if ( sUserId != 'error' ) {
                        var oSystemAccess = {"active":true,"comment":"","commissioned":sTPUserCreateDate,"commissioned_by":null,"decommissioned":null,"decommissioned_by":null,"expires":null,"system":this.sSystemName + ':' + inTarget,"user":sUserId,"user_reference":sTPUserId,"user_sys_reference":sTPUserEmail,"default_user":sDefaultUser};
                        this._impSystemAccess(oSystemAccess);
                    } else {
                        this.aDebug.push(this._prefix(sFunctionName) + '[' + i + ']:[' + inTarget + ']:[' + sTPUserId + ']:[' + sTPUserFirstName + ']:[' + sTPUserLastName + ']:[' + sTPUserEmail + ']:[' + sTPUserLogin + ']:[' + sTPUserIsActive + ']:[' + sTPUserIsAdministrator + ']:[' + sTPUserIsObserver + '][' + sTPUserCreateDate + ']');
                    }
                }
            }
        }

        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },
    //*********************************************************************************************

    //*********************************************************************************************
    //
    //*********************************************************************************************
    getTeams : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'getRoles';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/Teams?access_token=" + inSecKey + "&resultFormat=json&take=" + this.nTakeLimit + "&skip=0";
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

        var sMethod = 'get';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

        var oResult = this._poster(sTargetUrl, sMethod, '', this.nTimeout, this.sMidServer, this.sPostHeaders);
        if ( parseInt(oResult.ResponseCode) == 200 ) {
            var json = JSON.parse(oResult.ResponseBody);

            var oCleanup = new GlideRecord('u_targetprocess_team');
            oCleanup.addEncodedQuery('u_active=true^u_source=' + inTarget);
            oCleanup.query();
            while ( oCleanup.next() ) { oCleanup.u_active = false; oCleanup.update(); }

            var glider = new GlideRecord('u_imp_targetprocess_team');
            for ( var i = 0; i < json.Items.length; i++ ) {
                glider.initialize();
                glider.u_abbreviation      = json.Items[i].Abbreviation;
                glider.u_active            = true;
                glider.u_createdate        = this._parseDates(json.Items[i].CreateDate);
                glider.u_description       = json.Items[i].Description;
                glider.u_enddate           = this._parseDates(json.Items[i].EndDate);
                glider.u_entitytype        = '{"Id":' + json.Items[i].EntityType.Id + ',"Name":"' + json.Items[i].EntityType.Name + '"}';
                glider.u_icon              = json.Items[i].Icon;
                glider.u_id                = json.Items[i].Id;
                glider.u_isactive          = this._parseTrueFalse(json.Items[i].IsActive);
                glider.u_lastcommentdate   = this._parseDates(json.Items[i].LastCommentDate);
                glider.u_lastcommenteduser = this._parseDates(json.Items[i].LastCommentedUser);
                glider.u_linkedtestplan    = json.Items[i].LinkedTestPlan;
                glider.u_modifydate        = this._parseDates(json.Items[i].ModifyDate);
                glider.u_name              = json.Items[i].Name;
                glider.u_numericpriority   = json.Items[i].NumericPriority;
                glider.u_owner             = this._getOwner(inTarget, json.Items[i].Owner.Id);
                glider.u_project           = json.Items[i].Project;
                glider.u_source            = 'TargetProcess:' + inTarget;
                glider.u_startdate         = this._parseDates(json.Items[i].StartDate);
                glider.u_tags              = json.Items[i].Tags;
                glider.insert();
            }
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    getProjects : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'getProjects';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/Projects?access_token=" + inSecKey + "&resultFormat=json&take=" + this.nTakeLimit + "&skip=0";
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

        var sMethod = 'get';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

        var oResult = this._poster(sTargetUrl, sMethod, '', this.nTimeout, this.sMidServer, this.sPostHeaders);
        if ( parseInt(oResult.ResponseCode) == 200 ) {
            gs.print(oResult.ResponseBody, 'TESTING');
            var json = JSON.parse(oResult.ResponseBody);

            var oCleanup = new GlideRecord('u_targetprocess_project');
            oCleanup.addEncodedQuery('u_active=true^u_source=' + inTarget);
            oCleanup.query();
            while ( oCleanup.next() ) { oCleanup.u_active = false; oCleanup.update(); }

            var glider = new GlideRecord('u_imp_targetprocess_project');
            for ( var i = 0; i < json.Items.length; i++ ) {
                glider.initialize();
                glider.u_abbreviation      = json.Items[i].Abbreviation;
                glider.u_active            = true;
                glider.u_color             = json.Items[i].Color;
                glider.u_company           = json.Items[i].Company;
                glider.u_createdate        = this._parseDates(json.Items[i].CreateDate);
                glider.u_description       = json.Items[i].Description;
                glider.u_effort            = json.Items[i].Effort;
                glider.u_effortcompleted   = json.Items[i].EffortCompleted;
                glider.u_efforttodo        = json.Items[i].EffortToDo;
                glider.u_enddate           = this._parseDates(json.Items[i].EndDate);
                if ( JSUtil.notNil(json.Items[i].EntityState) ) { glider.u_entitystate = '{"Id":' + json.Items[i].EntityState.Id + ',"Name":"' + json.Items[i].EntityState.Name + '","NumericPriority":"' + json.Items[i].EntityState.NumericPriority + '"}'; }
                    if ( JSUtil.notNil(json.Items[i].EntityType) ) { glider.u_entitytype = '{"Id":' + json.Items[i].EntityType.Id + ',"Name":"' + json.Items[i].EntityType.Name + '"}'; }
                    glider.u_id                = json.Items[i].Id;
                glider.u_isactive          = this._parseTrueFalse(json.Items[i].IsActive);
                glider.u_isprivate         = this._parseTrueFalse(json.Items[i].IsPrivate);
                glider.u_isproduct         = this._parseTrueFalse(json.Items[i].IsProduct);
                glider.u_lastcommentdate   = this._parseDates(json.Items[i].LastCommentDate);
                glider.u_lastcommenteduser = json.Items[i].LastCommentedUser;
                glider.u_linkedtestplan    = json.Items[i].LinkedTestPlan;
                glider.u_mailreplyaddress  = json.Items[i].MailReplyAddress;
                glider.u_modifydate        = this._parseDates(json.Items[i].ModifyDate);
                glider.u_name              = json.Items[i].Name;
                glider.u_numericpriority   = json.Items[i].NumericPriority;
                glider.u_owner             = this._getOwner(inTarget, json.Items[i].Owner.Id);
                glider.u_plannedenddate    = this._parseDates(json.Items[i].PlannedEndDate);
                glider.u_plannedstartdate  = this._parseDates(json.Items[i].PlannedStartDate);
                if ( JSUtil.notNil(json.Items[i].Process) ) { glider.u_process = '{"Id":' + json.Items[i].Process.Id + ',"Name":"' + json.Items[i].Process.Name + '"}'; }
                if ( JSUtil.notNil(json.Items[i].Program) ) { glider.u_program = '{"Id":' + json.Items[i].Program.Id + ',"ResourceType":"' + json.Items[i].Program.ResourceType + '","Name":"' + json.Items[i].Program.Name + '"}'; }
                glider.u_progress          = json.Items[i].Progress;
                glider.u_project           = json.Items[i].Project;
                glider.u_source            = 'TargetProcess:' + inTarget;
                glider.u_startdate         = this._parseDates(json.Items[i].StartDate);
                glider.u_tags              = json.Items[i].Tags;
                glider.insert();
            }
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //=============================================================================================
    // gets all roles from TargetProcess.  Roles are then inserted into TP roles table to allow
    // role selection from Record Producer
    //=============================================================================================
    getRoles : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'getRoles';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/Roles?access_token=" + inSecKey + "&resultFormat=json&take=" + this.nTakeLimit + "&skip=0";
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

        var sMethod = 'get';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

        var oResult = this._poster(sTargetUrl, sMethod, '', this.nTimeout, this.sMidServer, this.sPostHeaders);
        if ( parseInt(oResult.ResponseCode) == 200 ) {
            var json = JSON.parse(oResult.ResponseBody);

            var oCleanup = new GlideRecord('u_targetprocess_role');
            oCleanup.addEncodedQuery('u_active=true^u_source=' + inTarget);
            oCleanup.query();
            while ( oCleanup.next() ) { oCleanup.u_active = false; oCleanup.update(); }

            var glider = new GlideRecord('u_imp_targetprocess_role');
            for ( var i = 0; i < json.Items.length; i++ ) {
                glider.initialize();
                glider.u_active         = true;
                glider.u_canchangeowner = json.Items[i].CanChangeOwner;
                glider.u_haseffort      = json.Items[i].HasEffort;
                glider.u_id             = json.Items[i].Id;
                glider.u_name           = json.Items[i].Name;
                glider.u_source         = inTarget;
                glider.insert();
            }
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //=============================================================================================
    //
    //=============================================================================================
    getEntityStates : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'getEntityStates';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');
        var oSystem = this.libs.ppbGetRecord({"Table":"u_system","Query":"u_active=true^u_system_name=TargetProcess:" + inTarget});

        var sTargetUrl = "https://" + oSystem.u_target_address.toString() + ".tpondemand.com/api/V1/EntityStates?access_token=" + oSystem.u_access_token.toString() + "&resultFormat=json&take=" + this.nTakeLimit + "&skip=0";
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

        var sMethod = 'get';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

        var oResult = this._poster(sTargetUrl, sMethod, '', this.nTimeout, oSystem.u_use_mid_server.getDisplayValue(), this.sPostHeaders);
        if ( parseInt(oResult.ResponseCode) == 200 ) {
            var json = JSON.parse(oResult.ResponseBody);

            var oCleanup = new GlideRecord('u_targetprocess_entity_state');
            oCleanup.addEncodedQuery('u_active=true^u_source=' + inTarget);
            oCleanup.query();
            while ( oCleanup.next() ) { oCleanup.u_active = false; oCleanup.update(); }

            var glider;
            for ( var i = 0; i < json.Items.length; i++ ) {
                var nItemId = 0, sItemName = '', nItemNumericPriority = 0, sItemResourceType = '';
                var nItemEntityTypeId = 0, sItemEntityTypeName = '';
                var nItemProcessId = 0, sItemProcessName = '';
                var nItemWorkflowId = 0, sItemWorkflowName = '';
                var nItemParentEntityStateId = 0, sItemParentEntityStateName = '', sItemParentEntityStateNumericPriority = 0;

                nItemId              = json.Items[i].Id + '';
                sItemName            = json.Items[i].Name + '';
                nItemNumericPriority = json.Items[i].NumericPriority + '';
                sItemResourceType    = json.Items[i].ResourceType + '';
                if ( JSUtil.notNil(json.Items[i].EntityType) ) {
                    nItemEntityTypeId   = json.Items[i].EntityType.Id + '';
                    sItemEntityTypeName = json.Items[i].EntityType.Name + '';
                }
                if ( JSUtil.notNil(json.Items[i].ParentEntityState) ) {
                    nItemParentEntityStateId              = json.Items[i].ParentEntityState.Id + '';
                    sItemParentEntityStateName            = json.Items[i].ParentEntityState.Name + '';
                    sItemParentEntityStateNumericPriority = json.Items[i].ParentEntityState.NumericPriority + '';
                }

                glider = new GlideRecord('u_targetprocess_entity_state');
                glider.addEncodedQuery('u_active=true^u_id=' + nItemId + '^u_entitytypeid=' + nItemEntityTypeId + '^u_processid=' + nItemProcessId + '^u_workflowid=' + nItemWorkflowId);
                glider.query();
                if ( glider.hasNext() ) {
                    while ( glider.next() ) {
                        glider.u_active                           = true;
                        glider.u_name                             = sItemName;
                        glider.u_numericpriority                  = nItemNumericPriority;
                        glider.u_resourcetype                     = sItemResourceType;
                        glider.u_entitytypename                   = sItemEntityTypeName;
                        glider.u_parententitystateid              = nItemParentEntityStateId;
                        glider.u_parententitystatename            = sItemParentEntityStateName;
                        glider.u_parententitystatenumericpriority = sItemParentEntityStateNumericPriority;
                        glider.u_payload                          = JSON.stringify(json.Items[i]);
                        glider.update();
                    }
                } else {
                    glider.initialize();
                    glider.u_active                           = true;
                    glider.u_id                               = nItemId;
                    glider.u_name                             = sItemName;
                    glider.u_numericpriority                  = nItemNumericPriority;
                    glider.u_resourcetype                     = sItemResourceType;
                    glider.u_entitytypeid                     = nItemEntityTypeId;
                    glider.u_entitytypename                   = sItemEntityTypeName;
                    glider.u_parententitystateid              = nItemParentEntityStateId;
                    glider.u_parententitystatename            = sItemParentEntityStateName;
                    glider.u_parententitystatenumericpriority = sItemParentEntityStateNumericPriority;
                    glider.u_payload                          = JSON.stringify(json.Items[i]);
                    glider.u_source                           = inTarget;
                    glider.insert();
                }
            }
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //=============================================================================================
    // gets all custom fields from TargetProcess.  Values are then inserted into TP custom fields
    // table to allow role selection from Record Producer
    //=============================================================================================
    getFields : function(inRecord, inTarget, inSecKey) {
        var sFunctionName = 'getFields';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        var sTargetUrl = "https://" + inTarget + ".tpondemand.com/api/V1/CustomFields?access_token=" + inSecKey + "&resultFormat=json&take=" + this.nTakeLimit + "&skip=0";
        this.aDebug.push(this._prefix(sFunctionName) + ' : Target URL : ' + sTargetUrl);

        var sMethod = 'get';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Method : ' + sMethod);

        var oResult = this._poster(sTargetUrl, sMethod, '', this.nTimeout, this.sMidServer, this.sPostHeaders);
        if ( parseInt(oResult.ResponseCode) == 200 ) {
            var json = JSON.parse(oResult.ResponseBody);

            var oCleanup = new GlideRecord('u_targetprocess_custom_fields');
            oCleanup.addEncodedQuery('u_active=true^u_source=' + inTarget);
            oCleanup.query();
            while ( oCleanup.next() ) { oCleanup.u_active = false; oCleanup.update(); }

            for ( var i = 0; i < json.Items.length; i++ ) {
                var sId               = json.Items[i].Id + '';
                var sName             = json.Items[i].Name + '';
                var sValue            = json.Items[i].Value + '';
                var sEntityFieldName  = json.Items[i].EntityFieldName + '';
                var sFieldType        = json.Items[i].FieldType + '';
                var sEnabledForFilter = json.Items[i].EnabledForFilter + '';
                var sRequired         = json.Items[i].Required + '';
                var sNumericPriority  = json.Items[i].NumericPriority + '';
                if ( JSUtil.notNil(json.Items[i].EntityType) ) {
                    if ( JSUtil.notNil(json.Items[i].EntityType.Id)   ) { sEntityTypeId   = json.Items[i].EntityType.Id;   }
                        if ( JSUtil.notNil(json.Items[i].EntityType.Name) ) { sEntityTypeName = json.Items[i].EntityType.Name; }
                    }
                if ( JSUtil.notNil(json.Items[i].Process) ) {
                    if ( JSUtil.notNil(json.Items[i].Process.Id)   ) { sProcessId   = json.Items[i].Process.Id;   }
                        if ( JSUtil.notNil(json.Items[i].Process.Name) ) { sProcessName = json.Items[i].Process.Name; }
                    }
                if ( sFieldType == 'MultipleSelectionList' || sFieldType == 'DropDown' ) {
                    var aValue = sValue.split('\n');
                    for ( var j = 0; j < aValue.length; j++ ) {
                        sValue = aValue[j].toString().replace(/\r/, "");
                        this._insertCustomField(sId + ':' + j, inTarget, sName, sValue, sEntityFieldName, sFieldType, sEnabledForFilter, sRequired, sNumericPriority, sEntityTypeId, sEntityTypeName, sProcessId, sProcessName, j);
                    }
                } else {
                    var sEntityTypeId   = null, sEntityTypeName = null;
                    var sProcessId   = null, sProcessName = null;
                    this._insertCustomField(sId, inTarget, sName, sValue, sEntityFieldName, sFieldType, sEnabledForFilter, sRequired, sNumericPriority, sEntityTypeId, sEntityTypeName, sProcessId, sProcessName, 0);
                }
            }
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },
    //*********************************************************************************************

    //*********************************************************************************************
    // generic logging function
    //*********************************************************************************************
    logger : function(inString) { if ( this.bDebug == true || this.bDebug == 'true' ) { gs.log(inString, 'TPDebug'); } },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    getGroupId : function(inTable, inSearch) {
        var output = inSearch;
        var glider = new GlideRecord(inTable);
        glider.addQuery('name', inSearch);
        glider.query();
        while ( glider.next() ) { output = glider.sys_id + ''; }
            return output;
    },

    //*********************************************************************************************
	//
	//*********************************************************************************************
	createDeliveryTask : function(inRecord) {
        var sFunctionName = 'createDeliveryTask';
        var macro = new TargetProcessMacro();

        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        var sPpUser           = 'no';
        var sUserName         = inRecord.requested_for.getDisplayValue();
        var sEmail            = inRecord.requested_for.email;
        var sTpBusUnit        = inRecord.variables.u_tp_business_unit;
        var sTpAdminAcc       = 'no';
        var sTpLocation       = inRecord.variables.u_tp_location;
        var sTpRole           = inRecord.variables.u_tp_role;
        var sLineManager      = inRecord.requested_for.manager.getDisplayValue();
        var sJobTitle         = inRecord.requested_for.title;
        var sRegion           = inRecord.u_region;
        var sShortDescription = 'Create TargetProcess account for user ' + sUserName;
        var sGroupId          = this.getGroupId('sys_user_group', incs.sSupportGroup);
        var sMoreDetails      = inRecord.variables.more_details;
        var aDescription      = [];

        if ( sPpUser == 'yes' || sPpUser == 'Yes' ) {
            sUserName    = inRecord.variables.u_tp_pp_first_name + ' ' + inRecord.variables.u_tp_pp_last_name;
            sEmail       = inRecord.variables.u_tp_pp_email;
            sLineManager = inRecord.variables.u_tp_pp_line_manager;
            sJobTitle    = inRecord.variables.u_tp_pp_job_title;
        }

        this.aDebug.push(this._prefix(sFunctionName) + ' : PaddyPower User   : ' + sPpUser);
        this.aDebug.push(this._prefix(sFunctionName) + ' : User name         : ' + sUserName);
        this.aDebug.push(this._prefix(sFunctionName) + ' : Email             : ' + sEmail);
        this.aDebug.push(this._prefix(sFunctionName) + ' : TP Business Unit  : ' + sTpBusUnit);
        this.aDebug.push(this._prefix(sFunctionName) + ' : TP Admin Account  : ' + sTpAdminAcc);
        this.aDebug.push(this._prefix(sFunctionName) + ' : TP Location       : ' + sTpLocation);
        this.aDebug.push(this._prefix(sFunctionName) + ' : TP Role           : ' + sTpRole + ' / ' + this._getTpRoleId(sTpRole));
        this.aDebug.push(this._prefix(sFunctionName) + ' : Line Manager      : ' + sLineManager);
        this.aDebug.push(this._prefix(sFunctionName) + ' : Job title         : ' + sJobTitle);
        this.aDebug.push(this._prefix(sFunctionName) + ' : Region            : ' + sRegion);
        this.aDebug.push(this._prefix(sFunctionName) + ' : Short description : ' + sShortDescription);
        this.aDebug.push(this._prefix(sFunctionName) + ' : Group             : ' + incs.sSupportGroup + ' (' + sGroupId + ')');
        this.aDebug.push(this._prefix(sFunctionName) + ' : More details      : ' + sMoreDetails);

        task.assignment_group  = sGroupId;
        task.u_region          = inRecord.u_region;
        task.short_description = sShortDescription;

        aDescription.push('Please create TargetProcess account for user: ' + sUserName);
        aDescription.push('- PaddyPower user  : ' + sPpUser);
        aDescription.push('- User             : ' + sUserName);
        aDescription.push('- Email            : ' + sEmail);
        aDescription.push('- Line Manager     : ' + sLineManager);
        aDescription.push('- Job Title        : ' + sJobTitle);
        aDescription.push('- TP Business Unit : ' + sTpBusUnit);
        aDescription.push('- TP Admin Account : ' + sTpAdminAcc);
        aDescription.push('- TP Location      : ' + sTpLocation);
        aDescription.push('- TP Role          : ' + sTpRole + ' / ' + this._getTpRoleId(sTpRole));
        aDescription.push('- More details about the request :');
        aDescription.push(sMoreDetails);
        task.description = aDescription.join('\n');
        this.aDebug.push(this._prefix(sFunctionName) + ' : Description       : ' + aDescription.join('\n'));
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    getInstance : function(inSystemName, inTarget) {
        var output = {}, oTemp, sAdGroup = '';
        var glider = new GlideRecord('u_system');
        glider.addEncodedQuery('u_active=true^u_system_nameSTARTSWITH' + inSystemName + '^ORu_system_name=' + inSystemName + '^u_target_address=' + inTarget);
        glider.query();
        while ( glider.next() ) {
            oTemp = JSON.parse(glider.u_additional_notes);
            sAdGroup = oTemp.ADGroup;
            output = {"sys_id":glider.sys_id,"u_system_name":glider.u_system_name,"u_environment":glider.u_environment,"u_access_type":glider.u_access_type,"u_access_token":glider.u_access_token,"u_username":glider.u_username,"u_password":glider.u_password,"u_default_user":glider.u_default_user,"u_target_address":glider.u_target_address,"AdGroup":sAdGroup,"u_active":glider.u_active};
        }
        return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    extractMetaData : function(inTargetSystem, inMaxLoops) {
        var glider = new GlideRecord('sys_choice');
        glider.addEncodedQuery("nameINjavascript:getTableExtensions('u_targetprocess_meta_data')^element=u_itemtype");
        glider.query();
        if ( glider.hasNext() ) {
            while ( glider.next() ) {
                gs.print(glider.value + ' : ' + glider.label + ' : ' + glider.hint);
                this.getTPMetaData(inTargetSystem, glider.hint, inMaxLoops);
            }
        }
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    getTPMetaData : function(inTargetSystem, inRecTypes, inMaxLoops) {
        var sFunctionName = 'getTPMetaData';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        var nMaxLoops = 20, nLoops = 0, i = 0;
        var oRegExp = new RegExp('/' + inRecTypes + '/' + inRecTypes + '/', 'jg');
        this.aDebug.push(this._prefix(sFunctionName) + ' : RegExp : ' + oRegExp);

        var sOwnerSysId, oOwner;
        var aDataBlock = [];
        var oSystem = this.libs.ppbGetRecord({"Table":"u_system","Query":"u_active=true^u_system_name=TargetProcess:" + inTargetSystem});
		if ( JSUtil.notNil(oSystem.sys_id) ) {
            this.aDebug.push(this._prefix(sFunctionName) + ' : Found a matching record for ' + inTargetSystem);
            var jResponseBody = {"Next":"https://" + oSystem.u_target_address + ".tpondemand.com/api/V1/" + inRecTypes + "/?take=1000&skip=0"};
            while ( JSUtil.notNil(jResponseBody.Next.toString()) ) {
                nLoops++;
                var nItemId = 0, sItemName = null, sItemType = '', nOwnerId = 0, sOwnerLogin = null;
                var sTargetAddress = jResponseBody.Next.toString().replace(oRegExp, '/' + inRecTypes + '/') + "&access_token=" + oSystem.u_access_token;
                var jInput = {"ApiRetry":2,"ApiSleep":5000,"Endpoint":sTargetAddress,"Headers":{"Content-Type":"application/json","Accept":"application/json"},"Method":"get","MidServer":oSystem.u_use_mid_server.getDisplayValue(),"Payload":"","Sleep":5000,"Timeout":120000};
                var jRestResult = this.libs.ppbPostRESTSync(jInput);
                try {
                    jResponseBody = JSON.parse(jRestResult.ResponseBody);
                    this.aDebug.push(this._prefix(sFunctionName) + ' : ResponseBody Items length : ' + jResponseBody.Items.length);
                    for ( i = 0; i < jResponseBody.Items.length; i++ ) {
                        this.aDebug.push(this._prefix(sFunctionName) + ' : -- processing row : ' + i);
                        nItemId   = jResponseBody.Items[i].Id;
                        sItemName = jResponseBody.Items[i].Name;
                        sItemType = jResponseBody.Items[i].ResourceType;
                        nOwnerId    = 0;
						sOwnerLogin = '';
						sOwnerSysId = '';
                        if ( JSUtil.notNil(jResponseBody.Items[i].Owner) ) {
                            nOwnerId    = jResponseBody.Items[i].Owner.Id;
                            sOwnerLogin = jResponseBody.Items[i].Owner.Login;
                            if ( JSUtil.notNil(sOwnerLogin) ) {
                                oOwner = this.libs.ppbGetRecord({"Table":"sys_user","Query":"u_userprincipalname=" + sOwnerLogin});
                                if ( JSUtil.notNil(oOwner.sys_id) ) {
                                    sOwnerSysId = oOwner.sys_id.toString();
                                }
                            }
                        }
                        aDataBlock.push('{"ItemId":' + nItemId + ',"ItemName":"' + this.libs.ppbJsonEncoding(sItemName) + '","ItemType":"' + this.libs.ppbJsonEncoding(sItemType) + '","OwnerId":' + nOwnerId + ',"OwnerLogin":"' + this.libs.ppbJsonEncoding(sOwnerLogin) + '","Owner":"' + sOwnerSysId + '","Source":"' + oSystem.sys_id.toString() + '"}');
                    }
                } catch ( err1 ) {
                    this.aDebug.push(this._prefix(sFunctionName) + ' : ERROR : ' + err1);
                    break;
                }
                if ( nLoops >= inMaxLoops ) { break; }
            }
        } else {
            this.aDebug.push(this._prefix(sFunctionName) + ' : No valid system record found for ' + inTargetSystem);
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Data block : ' + aDataBlock.length);
        if ( aDataBlock.length > 0 ) {
            this.disableTPMetaData(inRecTypes);
            for ( i = 0; i < aDataBlock.length; i++ ) {
                try {
                    var jInputResult = this.postTPMetaData(JSON.parse(aDataBlock[i]));
                } catch ( err2 ) {
                    gs.print('ERROR : ' + err2 + '; Data block : ' + aDataBlock[i]);
                }
            }
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');
        this.logger(this.aDebug.join('\n'));
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    disableTPMetaData : function(inRecTypes) {
        var glider = new GlideRecord('u_targetprocess_meta_data');
        var sEncodedQuery = 'u_active=true^u_itemtype=' + inRecTypes;
        glider.addEncodedQuery(sEncodedQuery);
        glider.query();
        while ( glider.next() ) {
            glider.u_active = false;
            glider.update();
        }
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    postTPMetaData : function(inObject) {
        var output = {"Action":"primed","RecordId":"primed"};
        var glider = new GlideRecord('u_targetprocess_meta_data');
        var sEncodedQuery = 'u_itemtype=' + inObject.ItemType + '^u_source=' + inObject.Source + '^u_itemid=' + inObject.ItemId;
        glider.addEncodedQuery(sEncodedQuery);
        glider.query();
        if ( glider.hasNext() ) {
            while ( glider.next() ) {
                output.RecordId = glider.sys_id.toString();

                glider.u_active         = true;
                glider.u_itemname       = inObject.ItemName;
				glider.u_itemvalue      = inObject.ItemValue;
                glider.u_itemowner      = inObject.Owner;
                glider.u_itemownerid    = inObject.OwnerId;
                glider.u_itemownerlogin = inObject.OwnerLogin;

                glider.update();
            }
            output.Action = 'updated';
        } else {
            glider.initialize();

            glider.u_active         = true;
            glider.u_itemid         = inObject.ItemId;
            glider.u_itemname       = inObject.ItemName;
            glider.u_itemowner      = inObject.Owner;
            glider.u_itemownerid    = inObject.OwnerId;
            glider.u_itemownerlogin = inObject.OwnerLogin;
            glider.u_itemtype       = inObject.ItemType;
            glider.u_source         = inObject.Source;

            output.RecordId = glider.insert();
            output.Action = 'inserted';
        }
        return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    getMapRecord: function(inSysId) {
        var output = '';
        var glider = new GlideRecord('u_targetprocess_team_mapping');
        glider.addEncodedQuery('sys_id=' + inSysId);
        glider.query();
        if ( glider.next() ) { output = glider; }
        return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _getAdGroupId : function(inField, inValue) {
        var output = inValue;
        var glider = new GlideRecord('u_bf_ad_group');
        glider.addEncodedQuery('u_active=true^' + inField + '=' + inValue);
        glider.query();
        while ( glider.next() ) { output = glider.sys_id.toString(); }
        return output;
    },

	//*********************************************************************************************
    // get user record from sys_user table using email address
    //*********************************************************************************************
    _getUser : function(inEmail) {
        var sFunctionName = '_getUser';
        var output = 'error';
        var sEncodedQuery = 'email=' + inEmail;
        var users = new GlideRecord('sys_user');
        users.addEncodedQuery(sEncodedQuery);
        users.query();
        while ( users.next() ) { output = users.sys_id + ''; }
            return output;
    },

    //*********************************************************************************************
    // get user record from sys_user table using email address
    //*********************************************************************************************
    _getSystemAccess : function(inSystemName, inUserId) {
        var sFunctionName = '_getSystemAccess';
        var output = 'new';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting.  Primed output : ' + output);
        var sEncodedQuery = 'u_system.u_system_name=' + inSystemName + '^u_user=' + inUserId;
        this.aDebug.push(this._prefix(sFunctionName) + ' : Encoded Query : ' + sEncodedQuery);
        var users = new GlideRecord('u_system_access');
        users.addEncodedQuery(sEncodedQuery);
        users.query();
        while ( users.next() ) { output = users.sys_id + ''; }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Result output : ' + output);
        return output;
    },

    //*********************************************************************************************
    // Two seperate types of insert operations.  Split from the function to save coding
    //*********************************************************************************************
    _insertCustomField : function(inId, inSource, inName, inValue, inEntityFieldName, inFieldType, inEnabledForFilter, inRequired, inNumericPriority, inEntityTypeId, inEntityTypeName, inProcessId, inProcessName, inOutputOrder) {
        var glider = new GlideRecord('u_imp_targetprocess_custom_fields');
        glider.initialize();
        glider.u_id               = inId;
        glider.u_source           = inSource;
        glider.u_name             = inName;
        glider.u_value            = inValue;
        glider.u_entityfieldname  = inEntityFieldName;
        glider.u_fieldtype        = inFieldType;
        glider.u_enabledforfilter = inEnabledForFilter;
        glider.u_required         = inRequired;
        glider.u_numericpriority  = inNumericPriority;
        glider.u_entitytypeid     = inEntityTypeId;
        glider.u_entitytypename   = inEntityTypeName;
        glider.u_processid        = inProcessId;
        glider.u_processname      = inProcessName;
        glider.u_outputorder      = inOutputOrder;
        glider.u_active           = true;
        glider.insert();
    },

    //*********************************************************************************************
    // Using a transform map to save coding
    //*********************************************************************************************
    _impSystemAccess : function(inData) {
        var sFunctionName = '_impSystemAccess';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');
        this.aDebug.push(this._prefix(sFunctionName) + '[active            ][' + inData.active + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[comment           ][' + inData.comment + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[commissioned      ][' + inData.commissioned + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[commissioned_by   ][' + inData.commissioned_by + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[decommissioned    ][' + inData.decommissioned + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[decommissioned_by ][' + inData.decommissioned_by + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[expires           ][' + inData.expires + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[system            ][' + inData.system + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[user              ][' + inData.user + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[user_reference    ][' + inData.user_reference + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[user_sys_reference][' + inData.user_sys_reference + ']');
        this.aDebug.push(this._prefix(sFunctionName) + '[default_user      ][' + inData.default_user + ']');
        var output = 'error';
        var glider = new GlideRecord('u_imp_system_access');
        glider.initialized();
        glider.u_active             = inData.active;
        glider.u_comment            = inData.comment;
        glider.u_commissioned       = inData.commissioned;
        glider.u_commissioned_by    = inData.commissioned_by;
        glider.u_decommissioned     = inData.decommissioned;
        glider.u_decommissioned_by  = inData.decommissioned_by;
        glider.u_expires            = inData.expires;
        glider.u_system             = inData.system;
        glider.u_user               = inData.user;
        glider.u_user_reference     = inData.user_reference;
        glider.u_user_sys_reference = inData.user_sys_reference;
        glider.u_default_user       = inData.default_user;
        output = glider.insert();
        this.aDebug.push(this._prefix(sFunctionName) + ' Stopping; Output : ' + output);
        return output;
    },

    //*********************************************************************************************
    // Macros are defined in the template with ${string}
    //*********************************************************************************************
    _processMacros : function(inTable, inTask, inString, inAction, inMapId) {
        var sFunctionName = '_processMacros';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        //var macros = new TargetProcessMacro();
        inString = inString.toString();
        this.aDebug.push(this._prefix(sFunctionName) + ' : inString : ' + inString);
        var grMacros = new GlideRecord('u_targetprocess_macro');
        grMacros.addQuery('u_active', true);
        grMacros.query();
        if ( grMacros.hasNext() ) {
            this.aDebug.push(this._prefix(sFunctionName) + ' : Processing matches');
            var macString, macPath, macValue, macLookup;
            while ( grMacros.next() ) {
                macString = grMacros.u_macro_name.toString();
                if ( inString.indexOf(macString) >= 0 ) {
                    macLookup = grMacros.u_macro_lookup.toString();
                    macPath   = grMacros.u_macro_path.toString();

                    this.aDebug.push(this._prefix(sFunctionName) + ' : macLookup : ' + macLookup);
                    switch ( macLookup ) {
                        case 'Property' :
                            var sValueOne = '', sValueTwo = '';
                            if ( grMacros.u_macro_path.indexOf('|') > 0) {
                                var aValue = grMacros.u_macro_path.split('|');
                                sValueOne = aValue[0] + '';
                                sValueTwo = aValue[1] + '';
                            } else {
                                sValueOne = grMacros.u_macro_path + '';
                            }
                            macValue = gs.getProperty(sValueOne, sValueTwo);
                            break;
                        case 'Function' :
                            this.aDebug.push(this._prefix(sFunctionName) + ' : "macLookup" : "' + macLookup + '", "macValue" : "' + macValue + '"');
                            if ( JSUtil.notNil(grMacros.u_macro_script) ) {
                                this.aDebug.push(this._prefix(sFunctionName) + ' : -- Evaluating function');
                                try {
                                    var oEvaluator = new GlideScopedEvaluator();
                                    var jsonVars   = {"inTable":inTable,"inTask":inTask,"inString":inString,"inAction":inAction,"inMapId":inMapId};
                                    macValue = oEvaluator.evaluateScript(grMacros, 'u_macro_script', jsonVars);
                                } catch ( err ) {
                                    this.aDebug.push(this._prefix(sFunctionName) + ' : -- ERROR : ' + err);
                                }
                            } else {
                                this.aDebug.push(this._prefix(sFunctionName) + ' : -- Executing function');
                                macValue = macros[grMacros.u_macro_path](inTask, inAction);
                            }
                            this.aDebug.push(this._prefix(sFunctionName) + ' : "macLookup" : "' + macLookup + '", "macValue" : "' + macValue + '"');
                            break;
                        case 'Glide' :
                            macValue = inTask[grMacros.u_macro_path];
                            break;
                        case 'DisplayValue' :
                            macValue = inTask[grMacros.u_macro_path].getDisplayValue();
                            break;
                        case 'StaticValue' :
                            macValue = grMacros.u_macro_value;
                            break;
                        default :
                            macValue = inTask[grMacros.u_macro_path].getDisplayValue();
                            break;
                    }
                    inString = inString.replace(new RegExp('\\$\\{' + macString + '\\}', 'g'), macValue);
                    this.aDebug.push(this._prefix(sFunctionName) + ' : ---> Match found : ' + macString + '/' + macPath + ' = ' + macValue);
                }
            }
        } else {
            this.aDebug.push(this._prefix(sFunctionName) + ' : No macro matches');
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping : inString : ' + inString);
        return inString;
    },

    //*********************************************************************************************
    // converts epoch strings into date strings.  Offset caters for windows and unix time
    // differences
    //*********************************************************************************************
    _setOriginTime : function(inEpoch, inOffset) {
        var gdt = new GlideDateTime();
        if ( inEpoch.toString().length <= 13 ) { inEpoch = inEpoch * inOffset; }
            gdt.setNumericValue(inEpoch);
        var d_string = new GlideDateTime(gdt);
        return d_string;
    },

    //*********************************************************************************************
    // generic script to post all transactions using RESTMessageV2
    //*********************************************************************************************
    _poster : function(inEndpoint, inMethod, inPayload, inTimeout, inMidServer, inHeaders) {
        var sFunctionName = '_poster';
        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        var response;
        this.aDebug.push(this._prefix(sFunctionName) + ' Endpoint   : ' + inEndpoint);
        this.aDebug.push(this._prefix(sFunctionName) + ' Method     : ' + inMethod);
        this.aDebug.push(this._prefix(sFunctionName) + ' Payload    : ' + inPayload);
        this.aDebug.push(this._prefix(sFunctionName) + ' Timeout    : ' + inTimeout);
        this.aDebug.push(this._prefix(sFunctionName) + ' MID Server : ' + inMidServer);
        this.aDebug.push(this._prefix(sFunctionName) + ' Headers    : ' + inHeaders);

        var nResponseCode = 500, sResponseBody = {}, sResponseEndpoint = '', sResponseHeaders = '', aResponseHeaders = [], sRequestHeaders = '';
        this.aDebug.push(this._prefix(sFunctionName) + ' Response Code     : ' + nResponseCode);

        if ( JSUtil.notNil(inEndpoint) ) {
            if ( JSUtil.nil(inTimeout) ) { inTimeout = 120000; }
                var rest = new sn_ws.RESTMessageV2();
            rest.setEndpoint(inEndpoint);
            rest.setEccParameter('skip_sensor', true);
            rest.setHttpTimeout(inTimeout);
            rest.waitForResponse(inTimeout);
            rest.setHttpMethod(inMethod);
            for ( var key in inHeaders ) { rest.setRequestHeader(key, inHeaders[key]); }
                if ( JSUtil.notNil(inPayload) ) { rest.setRequestBody(inPayload); }
                if ( JSUtil.notNil(inMidServer) ) { rest.setMIDServer(inMidServer); }
                for ( var i = 1; i <= parseInt(this.nTPApiRetry); i++ ) {
                try {
                    response          = rest.execute();
                    if ( JSUtil.notNil(inMidServer) ) { rest.waitForResponse(60); }
                    nResponseCode     = response.getStatusCode();
                    sResponseBody     = response.haveError() ? response.getErrorMessage() : response.getBody();
                    aResponseHeaders  = response.getHeaders();
                    sResponseEndpoint = response.getEndpoint();
                    sRequestHeaders   = response.getRequestHeaders();
                    this.aDebug.push(this._prefix(sFunctionName) + '[' + i + '] SUCCESS');
                } catch( err ) {
                    var aResponseBody = [];
                    aResponseBody.push('Error Code : ' + err.getErrorCode());
                    aResponseBody.push('Error Message : ' + err.getMessage());
                    aResponseBody.push(err.getErrorMessage());
                    sResponseBody = aResponseBody.join('\n');
                    this.aDebug.push(this._prefix(sFunctionName) + '[' + i + '] ERROR');
                    aResponseHeaders  = response.getHeaders();
                } finally {
                    sRequestBody = rest ? rest.getRequestBody():null;
                    for ( var j = 0; j < aResponseHeaders.length; j++ ) { sResponseHeaders += aResponseHeaders[j] + ''; }
                    }
                if ( parseInt(nResponseCode) > 0 ) {
                    this.aDebug.push(this._prefix(sFunctionName) + '[' + i + '] : Breaking loop');
                    break;
                } else {
                    this.aDebug.push(this._prefix(sFunctionName) + '[' + i + '] : Retrying request');
                    gs.sleep(parseInt(this.nTPApiSleeps));
                }
            }
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : OUTPUT DATA');
        this.aDebug.push(this._prefix(sFunctionName) + ' : ResponseCode     : ' + nResponseCode);
        this.aDebug.push(this._prefix(sFunctionName) + ' : ResponseBody     : ' + sResponseBody);
        this.aDebug.push(this._prefix(sFunctionName) + ' : RequestBody      : ' + sRequestBody);
        this.aDebug.push(this._prefix(sFunctionName) + ' : ResponseEndpoint : ' + sResponseEndpoint);
        this.aDebug.push(this._prefix(sFunctionName) + ' : ResponseHeaders  : ' + sResponseHeaders.length);
        this.aDebug.push(this._prefix(sFunctionName) + ' : RequestHeaders   : ' + sRequestHeaders);
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');

        return {"ResponseCode":nResponseCode,"ResponseBody":sResponseBody,"RequestBody":sRequestBody,"ResponseEndpoint":sResponseEndpoint, "ResponseHeaders":sResponseHeaders,"RequestHeaders":sRequestHeaders};
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _createIncident : function(inRecord, inResult) {
        var glider = new GlideRecord('incident');
        glider.initialize();

        var sChannel         = gs.getProperty('PPB.integration.TargetProcess.Incident.Channel', '2f148b5a7519a4c0a6f751aec85917e5'); // Internal
        var sServiceAffected = gs.getProperty('PPB.integration.TargetProcess.Incident.ServiceAffected', '2ceb74132d93d400a6f73100202fabe1'); // Service Management Tools
        var sTechService     = gs.getProperty('PPB.integration.TargetProcess.Incident.TechService', '45c0b9f4a9436000aa69b6076eb9f639'); // Service Now
        var sCaller          = gs.getProperty('PPB.integration.TargetProcess.Incident.Caller', 'b54760014f633240957492918110c739'); // ppb.snc.automation
        var sAssignGroup     = gs.getProperty('PPB.integration.TargetProcess.Incident.AssignGroup', '1180e4982debd400a6f73100202fab34'); // Service Now Support
        var sLocation        = gs.getProperty('PPB.integration.TargetProcess.Incident.Location', '712a02d12dbb1c00a6f73100202fab40'); // Hammersmith

        var sShortDesc = 'Error creating User Story for ' + inRecord.u_checklist_item.getDisplayValue() + ' on ' + inRecord.u_service.getDisplayValue();
        var aDesc = [];
        aDesc.push(sShortDesc);
        aDesc.push('');
        aDesc.push('Response Code : ' + inResult.ResponseCode);
        aDesc.push('Response Body : ' + inResult.ResponseBody);
        aDesc.push('Request Body : ' + inResult.RequestBody);
        aDesc.push('Response Endpoint : ' + inResult.ResponseEndpoint);
        aDesc.push('Response Headers : ' + inResult.ResponseHeaders);
        aDesc.push('Request Headers : ' + inResult.RequestHeaders);

        glider.u_channel           = sChannel;
        glider.u_service_affected  = sServiceAffected;
        glider.u_jurisdiction      = 'Internal';
        glider.impact              = '3';
        glider.u_incident_outage   = '4';
        glider.priority            = '5';
        glider.u_technical_service = sTechService;
        glider.caller_id           = sCaller;
        glider.assignment_group    = sAssignGroup;
        glider.short_description   = sShortDesc;
        glider.u_classification    = 'Technical Issue';
        glider.contact_type        = 'self-service';
        glider.description         = aDesc.join('\n');
        glider.u_req_phone         = 'na';
        glider.location            = sLocation;
        glider.u_req_email         = 'na';
        glider.u_req_desk          = 'na';
        glider.work_notes          = this.aDebug.join('\n');

        return glider.insert();
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
	_postPowerShell : function(inAction, inGroup, inUser) {
        var sFunctionName = '_postPowerShell';

        this.aDebug.push(this._prefix(sFunctionName) + ' : Starting');

        var sReturnCode = '', sOutputMsg = '';
        // BF1000 : Success
        // BF1001 : Group not found
        // BF1002 : User not found in AD
        // BF1003 : Error adding user to group
        var sPowerShellSuccess = 'BF1000';

        var oResponse = {"Status":"Error","Code":"BF1002","Message":"Priming","output":"Priming","error":"Priming"};

        var nSeconds   = gs.getProperty('PPB.integration.TargetProcess.User.SSO.ADTimeout',  '60');
        var sDomain    = gs.getProperty('PPB.integration.TargetProcess.User.SSO.ADDomain',   'corp.ppbplc.com');
        var oDomain    = this._getGetDomainDetails(sDomain);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : Code           : ' + oDomain.Code);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : Message        : ' + oDomain.Message);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : Name           : ' + oDomain.Name);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : DisplayName    : ' + oDomain.DisplayName);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : UseMIDServer   : ' + oDomain.UseMIDServer);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : PowerShellFile : ' + oDomain.PowerShellFile);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : ADUserName     : ' + oDomain.ADUserName);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : ADPassword     : ' + oDomain.ADPassword);
        this.aDebug.push(this._prefix(sFunctionName) + ' : _getGetDomainDetails : EncryptionKey  : ' + oDomain.EncryptionKey);
        this.aDebug.push(this._prefix(sFunctionName) + '');

        if ( oDomain.Code == 'Success' ) {
            var sScript = oDomain.PowerShellFile + ' -MidUserName \"' + oDomain.ADUserName + '" -MidPassword "' + oDomain.ADPassword + '" -MidKey "' + oDomain.EncryptionKey + '" -TargetDomain "' + oDomain.Name + '" -Action "' + inAction + '" -GroupName "' + inGroup + '" -UserName "' + inUser + '" -OutputFile "na" -GlobalCatalog "' + oDomain.Name + '"';
            this.aDebug.push(this._prefix(sFunctionName) + ' : PowerShell Script : ' + sScript);

            var oPsProbe = new PowershellProbe(oDomain.UseMIDServer, '127.0.0.1');
            oPsProbe.setScript(sScript);
            oPsProbe.setMaxWait(nSeconds);
            oResponse = oPsProbe.execute(true);

            if ( JSUtil.notNil(oResponse) ) {
                var aOutput = oResponse.output.split('~#~');
                if ( aOutput.length > 1 ) { sReturnCode = aOutput[1]; }
                if ( aOutput.length > 3 ) { sOutputMsg = aOutput[3]; }
                if ( sReturnCode == sPowerShellSuccess ) {
                    this.aDebug.push(this._prefix(sFunctionName) + ' : Processing success response');
                    oResponse.Status   = 'Success';
                    oResponse.Code    = sReturnCode;
                    oResponse.Message = sOutputMsg;
                } else {
                    this.aDebug.push(this._prefix(sFunctionName) + ' : Processing error response');
                    oResponse.Status  = 'Error';
                    oResponse.Code    = sReturnCode;
                    oResponse.Message = sOutputMsg;
                }
            } else {
                this.aDebug.push(this._prefix(sFunctionName) + ' : Processing probe error');
                oResponse.Status  = 'Error';
                oResponse.Code    = 'BF100?';
                oResponse.Message = 'No response from PowerShell probe';
            }
        } else {
            this.aDebug.push(this._prefix(sFunctionName) + ' : Processing success response');
            oResponse.Status  = 'Error';
            oResponse.Code    = 'BF100?';
            oResponse.Message = 'Failed to get data for the target domain';
            oResponse.output  = '';
            oResponse.error   = oResponse.Status + ' : ' + oDomain.Code + ' : ' + oDomain.Message;
        }
        this.aDebug.push(this._prefix(sFunctionName) + ' : oResponse.Status  : ' + oResponse.Status);
        this.aDebug.push(this._prefix(sFunctionName) + ' : oResponse.Code    : ' + oResponse.Code);
        this.aDebug.push(this._prefix(sFunctionName) + ' : oResponse.Message : ' + oResponse.Message);
        this.aDebug.push(this._prefix(sFunctionName) + ' : oResponse.output  : ' + oResponse.output);
        this.aDebug.push(this._prefix(sFunctionName) + ' : oResponse.error   : ' + oResponse.error);
        this.aDebug.push(this._prefix(sFunctionName) + ' : Stopping');

        return oResponse;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _getGetDomainDetails : function(inDomainName) {
        var output = {"Code":"Error","Message":"Primer","Name":"Primer","DisplayName":"Primer","UseMIDServer":"Primer","PowerShellFile":"Primer","ADUserName":"Primer","ADPassword":"Primer","EncryptionKey":"Primer"};
        var glider = new GlideRecord('u_bf_ad_domain');
        glider.addEncodedQuery('u_active=true^u_name=' + inDomainName);
        glider.query();
        if ( glider.hasNext() ) {
            while ( glider.next() ) {
                output.Code           = 'Success';
                output.Message        = 'Matching domain record found';
                output.Name           = glider.u_name;
                output.DisplayName    = glider.u_display_name;
                output.UseMIDServer   = glider.u_use_mid_server.name;
                output.PowerShellFile = glider.u_powershell_file;
                output.ADUserName     = glider.u_ad_user_name;
                output.ADPassword     = glider.u_ad_password;
                output.EncryptionKey  = glider.u_encryption_key;
            }
        } else {
            output.Code           = 'Error';
            output.Message        = 'No matching domain record found';
        }
        return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _getTpRoleId : function(inRoleId) {
        var output = '';
        var glider = new GlideRecord('u_targetprocess_role');
        glider.addEncodedQuery('u_active=true^u_id=' + inRoleId);
        glider.setLimit(1);
        glider.query();
        while ( glider.next() ) { output = glider.u_name; }
            return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _getOwner : function(inTarget, inRecord) {
        var output = '';
        var glider = new GlideRecord('u_system_access');
        glider.addEncodedQuery('u_active=true^u_system.u_system_name=TargetProcess:' + inTarget + '^u_user_reference=' + inRecord);
        glider.query();
        while ( glider.next() ) { output = glider.sys_id; }
            return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _parseTrueFalse : function(inString, inDefault) {
        var output = inDefault;
        if ( JSUtil.nil(inString) ) {
            output = inDefault;
        } else {
            if ( inString == true || inString == 'true' ) { output = true; }
            }
        return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _parseDates : function(inString) {
        var output = inString;
        if ( JSUtil.notNil(output) ) {
            var aOutput = output.split('(');
            aOutput     = aOutput[1].split(')');
            output      = this._setOriginTime(parseInt(aOutput[0]), 1);
        }
        return output;
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _checkTrigger : function(inTask, inSystem, inAction) {
        var bResult = false, aMessage = [], oRecord = '';
        var sTableName   = inTask.getTableName();
        var sAssignGroup = inTask.assignment_group.getDisplayValue();
        var glider = new GlideRecord('u_targetprocess_team_mapping');
        glider.addEncodedQuery('u_active=true^u_target_system.u_system_name=TargetProcess:' + inSystem + '^u_table=' + sTableName + '^u_assignement_group.name=' + sAssignGroup);
        glider.orderBy('u_table');
        glider.orderBy('u_assignement_group');
        glider.orderBy('u_team');
        glider.orderBy('u_project');
        glider.orderBy('u_epic');
        glider.orderBy('u_feature');
        glider.orderBy('u_state');
        glider.orderBy('u_priority');
        glider.query();
        if ( glider.hasNext() ) {
            while ( glider.next() ) {
                if ( glider[inAction] == true ) {
                    aMessage.push(glider.u_number + ' correct action type');
                    if ( GlideFilter.checkRecord(inTask, glider.u_trigger_condition) ) {
                        oRecord = glider;
                        bResult = true;
                        aMessage.push('-- condition matches, breaking review');
                        var sMessageBody = incs._processMacros(glider.getTableName(), glider, incs.sUserStoryCreate, 'create', oResult.MapObject.sys_id);
                        break;
                    } else {
                        aMessage.push('-- condition does not match');
                    }
                } else {
                    aMessage.push(glider.u_number + ' not the correct action type');
                }
            }
        } else {
            aMessage.push('No matching table and group found');
        }
        return {"Result":bResult,"Message":aMessage.join('\n'),"MapObject":oRecord};
    },

    //*********************************************************************************************
    //
    //*********************************************************************************************
    _prefix : function(inFunctionName) { return '[' + new Date().getTime() + '][' + inFunctionName + ']'; },

    type: 'TargetProcessLibrary'
};
