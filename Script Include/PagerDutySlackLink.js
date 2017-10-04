var PagerDutySlackLink = Class.create();
PagerDutySlackLink.prototype = {
    initialize: function() {
        this.libs = new PPBLibrary();

        this.aDebug = [];
        this.bDebug = gs.getProperty('ppb.automation.pagerduty.oncall_export.debug', 'true');
        this.sDebug = gs.getProperty('ppb.automation.pagerduty.oncall_export.prefix', 'PagerDutyAPI');

        this.oSlackSystem     = this._getSlackSystem(gs.getProperty('ppb.automation.pagerduty.oncall_export.SlackSystemId', 'e54abd7edb66f600f82ada94ce96192d'));
        this.oPagerDutySystem = this._getPagerDutySystem(gs.getProperty('ppb.automation.pagerduty.oncall_export.PagerDutySystemId', '78c5672c37a95600a15e19a543990e13'));

        this.nMaxLoops = parseInt(gs.getProperty('ppb.automation.pagerduty.oncall_export.MaxLoop', 100));
        this.nLimit    = parseInt(gs.getProperty('ppb.automation.pagerduty.oncall_export.Limit', 100));
    },

    /**********************************************************************************************
     * When a PagerDuty user is disabled, check Slack for a matching email and kick the user from
     * this channel
     **********************************************************************************************/
    runPagerDutySlackKickSimple : function() {
        var glider = new GlideRecord('u_system_access');
        glider.addEncodedQuery('u_system=' + this.oPagerDutySystem.u_system.sys_id.toString() + '^u_active=false');
        glider.query();
        while ( glider.next() ) {
            var jCheck = this.checkSlackUser(glider.u_user.email.toString());
            if ( jCheck.id != "error" ) {
                gs.print('[' + glider.sys_id.toString() + '][PagerDuty : ' + glider.u_user_reference.toString() + '][Slack : ' + jCheck.id + '][' + glider.u_user.email.toString() + ']');
                gs.print('-- ' + this.postSlackChannelKick(this._getSlackGroupChannelId(), jCheck.id));
            }
        }
    },

    /**********************************************************************************************
     * When a PagerDuty user is added, check Slack for the matching email and invite the user to
     * this channel
     **********************************************************************************************/
    runPagerDutySlackInviteSimple : function() {
        var glider = new GlideRecord('u_system_access');
        glider.addEncodedQuery('u_system=' + this.oPagerDutySystem.u_system.sys_id.toString() + '^u_active=true');
        glider.query();
        while ( glider.next() ) {
            var jCheck = this.checkSlackUser(glider.u_user.email.toString());
            if ( jCheck.id != "error" ) {
                gs.print('[' + glider.sys_id.toString() + '][PagerDuty : ' + glider.u_user_reference.toString() + '][Slack : ' + jCheck.id + '][' + glider.u_user.email.toString() + ']');
                gs.print('-- ' + this.postSlackChannelInvite(this._getSlackGroupChannelId(), jCheck.id));
            }
        }
    },

    /**********************************************************************************************
     * When a PagerDuty user is added, find a related account in Slack and invite this account to
     * this channel
     * If no Slack account is found, create a new account and invite this user into this channel
     **********************************************************************************************/
    runPagerDutySlackInvite : function () {
        var nLoop = 0;
        var nMaxLoops = parseInt(gs.getProperty('ppb.automation.pagerduty.oncall_export.ImportMaxLoop', 30));
        var sMembers  = this._getChannelMembers();
        var glider = new GlideRecord('u_system_access');
        glider.addEncodedQuery('u_active=true^u_system=' + this.oPagerDutySystem.u_system.sys_id.toString() + '^u_user!=' + this.oPagerDutySystem.u_system.u_default_user.sys_id.toString());
        glider.query();
        while ( glider.next() ) {
            nLoop++;
            var sUserReference = null;
            var oSystemAccessUser = this.libs.ppbGetRecord({"Table":"u_system_access","Query":"u_active=true^u_system=" + this.oSlackSystem.sys_id.toString() + "^u_user=" + glider.u_user.sys_id.toString()});
            if ( JSUtil.notNil(oSystemAccessUser.sys_id.toString()) ) {
                sUserReference = oSystemAccessUser.u_user_reference;
            } else {
                var jOutput = this.checkSlackUser(glider.u_user.email.toString());
                if ( jOutput.id != 'error' ) {
                    sUserReference = jOutput.id;
                    var sQuery = 'u_active=true^u_system=' + this.oSlackSystem.sys_id.toString() + '^u_user_reference=' + jOutput.id;
                    var jSystemInput = {
                        "AccessData"      : jOutput.groups,
                        "Active"          : true,
                        "Comment"         : "",
                        "Commissioned"    : new GlideDateTime(),
                        "CommissionedBy"  : "",
                        "Decomissioned"   : "",
                        "DecomissionedBy" : "",
                        "Expires"         : "",
                        "Query"           : sQuery,
                        "System"          : this.oSlackSystem.sys_id.toString(),
                        "User"            : glider.u_user.sys_id.toString(),
                        "UserRef"         : jOutput.id,
                        "UserSysRef"      : jOutput.userName + ' : ' + jOutput.emails
                    };
                    var oSystemAccess = this._postSystemAccess(jSystemInput);
                } else {
                    jOutput = this.postSlackUser(glider.u_user);
                    sUserReference = jOutput.id.toString();
                }
            }
            if ( sMembers.indexOf(sUserReference) < 0 ) {
                var sResult = this.postSlackChannelInvite(this._getSlackGroupChannelId(), sUserReference);
            }
            if ( nMaxLoops > 0 ) {
                if ( nLoop >= nMaxLoops ) {
                    break;
                }
            }
        }
    },

    /**********************************************************************************************
     * Get all users from PagerDuty
     **********************************************************************************************/
    getPagerDutyUsers : function() {
        var json = {"more":true};
        var nLoop     = 0;
        var nOffset   = 0;
        while ( json.more == true ) {
            var sEndpoint = encodeURI("https://api.pagerduty.com/users?total=true&offset=" + nOffset + "&limit=" + this.nLimit);
            var jInput = {
                "ApiRetry"  : 3,
                "ApiSleep"  : 5000,
                "Endpoint"  : sEndpoint,
                "Headers"   : {
                    "Accept"        : "application/vnd.pagerduty+json;version=2",
                    "Authorization" : "Token token=" + this.oPagerDutySystem.u_meta_value,
                    "Content-Type"  : "application/json"
                },
                "Method"    : "get",
                "MidServer" : null,
                "Payload"   : null,
                "Timeout"   : 120000
            };
            var jResult = this.libs.ppbPostRESTSync(jInput);
            if ( jResult.ResponseCode === 200 ) {
                if ( nLoop == 0 ) { this._disableRecords('u_system_access', 'u_active=true^u_system=' + this.oPagerDutySystem.u_system.sys_id.toString()); }
                json = JSON.parse(jResult.ResponseBody);
                for ( var i = 0; i < json.users.length; i++ ) {
                    var sQuery = null;
                    var sUserId = null;
                    var sUserRef = null;
                    var sUserSysRef = null;
                    var oUser = this.libs.ppbGetRecord({"Table":"sys_user","Query":"email=" + json.users[i].email + "^ORu_userprincipalname=" + json.users[i].email + "^ORname=" + json.users[i].name + "^nameISNOTEMPTY"});
                    sUserId  = oUser.sys_id.toString();
                    sUserRef = json.users[i].id.toString();
                    if ( JSUtil.notNil(sUserId) ) {
                        sUserSysRef = '/users/' + json.users[i].id;
                    } else {
                        sUserId     = this.oPagerDutySystem.u_system.u_default_user.sys_id.toString();
                        sUserSysRef = json.users[i].id + ' : ' + json.users[i].name + ' : ' + json.users[i].email;
                    }
                    sQuery = "u_system=" + this.oPagerDutySystem.u_system.sys_id.toString() + "^u_user_reference=" + json.users[i].id.toString();
                    var oUserSystem = this.libs.ppbGetRecord({"Table":"u_system_access","Query":sQuery});
                    if ( JSUtil.notNil(oUserSystem.sys_id) ) {
                        sUserId = oUserSystem.u_user.sys_id.toString();
                        sQuery  = "sys_id=" + oUserSystem.sys_id.toString();
                    }
                    var jSystemInput = {
                        "AccessData"      : "",
                        "Active"          : true,
                        "Comment"         : "",
                        "Commissioned"    : new GlideDateTime(),
                        "CommissionedBy"  : "",
                        "Decomissioned"   : "",
                        "DecomissionedBy" : "",
                        "Expires"         : "",
                        "Query"           : sQuery,
                        "System"          : this.oPagerDutySystem.u_system.sys_id.toString(),
                        "User"            : sUserId,
                        "UserRef"         : sUserRef,
                        "UserSysRef"      : sUserSysRef
                    };
                    var sSystemAccess = this._postSystemAccess(jSystemInput);
                    sSystemAccess = '';
                    oUserSystem = '';
                    oUser = '';
                }
            } else {
                json.more = false;
            }
            nOffset = parseInt(nOffset + this.nLimit);
            if ( this.nMaxLoops > 0 ) { if ( nLoop >= this.nMaxLoops ) { break; } else { nLoop++; } }
        }
    },

    /**********************************************************************************************
     * Get all Slack users
     **********************************************************************************************/
    getSlackUsers : function() {
        var nLoop     = 0;
        var nOffset   = 0;
        var json = {"totalResults":parseInt(this.nLimit + 1)};
        while ( nOffset < json.totalResults ) {
            var sEndpoint = encodeURI("https://api.slack.com/scim/v1/Users?count=" + this.nLimit + "&startIndex=" + nOffset);
            var jInput = {
                "ApiRetry"  : 3,
                "ApiSleep"  : 5000,
                "Endpoint"  : sEndpoint,
                "Headers"   : {
                    "Accept"        : "application/json",
                    "Authorization" : "Bearer " + this._getSlackSCIMToken(),
                    "Content-Type"  : "application/json"
                },
                "Method"    : "get",
                "MidServer" : null,
                "Payload"   : null,
                "Timeout"   : 120000
            };
            var jResult = this.libs.ppbPostRESTSync(jInput);
            if ( jResult.ResponseCode === 200 ) {
                if ( nLoop == 0 ) { this._disableRecords('u_system_access', 'u_active=true^u_system=' + this.oSlackSystem.sys_id.toString()); }
                json = JSON.parse(jResult.ResponseBody);
                for ( var i = 0; i < json.Resources.length; i++ ) {
                    var sSystemAccess = null, sQuery = null, sUserId = null;
                    var sId = null, sUserName = null, sGivenName = null, sFamilyName = null, sEmail = null, bActive = null, nGroups = null;
                    sId         = json.Resources[i].id;
                    sUserName   = json.Resources[i].userName;
                    sGivenName  = json.Resources[i].name.givenName;
                    sFamilyName = json.Resources[i].name.familyName;
                    bActive     = json.Resources[i].active;
                    nGroups     = parseInt(json.Resources[i].groups.length);
                    for ( var j = 0; j < json.Resources[i].emails.length; j++ ) {
                        if ( json.Resources[i].emails[j].primary.toString() == 'true' ) {
                            sEmail = json.Resources[i].emails[j].value;
                        }
                    }
                    sUserId = this.oSlackSystem.u_default_user.sys_id.toString();
                    var oUser = this.libs.ppbGetRecord({"Table":"sys_user","Query":"email=" + sEmail + "^ORu_userprincipalname=" + sEmail + "^ORname=" + sGivenName + " " + sFamilyName + "^nameISNOTEMPTY"});
                    if ( JSUtil.notNil(oUser.sys_id) ) {
                        sUserId = oUser.sys_id.toString();
                    }
                    sQuery = "u_system.sys_id=" + this.oSlackSystem.sys_id.toString() + "^u_user_reference=" + sId;
                    var oUserSystem = this.libs.ppbGetRecord({"Table":"u_system_access","Query":sQuery});
                    if ( JSUtil.notNil(oUserSystem.sys_id) ) {
                        sUserId = oUserSystem.u_user.sys_id.toString();
                        sQuery  = "sys_id=" + oUserSystem.sys_id.toString();
                    }
                    var jSystemInput = {
                        "AccessData"      : nGroups,
                        "Active"          : true,
                        "Comment"         : "",
                        "Commissioned"    : new GlideDateTime(),
                        "CommissionedBy"  : "",
                        "Decomissioned"   : "",
                        "DecomissionedBy" : "",
                        "Expires"         : "",
                        "Query"           : sQuery,
                        "System"          : this.oSlackSystem.sys_id.toString(),
                        "User"            : sUserId,
                        "UserRef"         : sId,
                        "UserSysRef"      : sUserName + ' : ' + sEmail
                    };
                    sSystemAccess = this._postSystemAccess(jSystemInput);
                }
            }
            nOffset = parseInt(nOffset + this.nLimit);
            if ( this.nMaxLoops > 0 ) {
                if ( nLoop >= this.nMaxLoops ) {
                    break;
                } else {
                    nLoop++;
                }
            }
        }
    },

    /**********************************************************************************************
     * Loop through all PagerDuty users to check whey they are next oncall
     **********************************************************************************************/
    getNextOncall : function() {
        var glider = new GlideRecord('u_system_access');
        glider.addEncodedQuery('u_active=true^u_system=' + this.oPagerDutySystem.u_system.sys_id.toString());
        glider.query();
        while ( glider.next() ) {
            var sEndpoint = encodeURI("https://api.pagerduty.com/escalation_policies?user_next_oncall_id=" + glider.u_user_reference + "&include%5B%5D=user_next_oncall&total=true");
            var oInput = {
                "ApiRetry"  : 2,
                "ApiSleep"  : 5000,
                "Endpoint"  : sEndpoint,
                "Headers"   : {
                    "Accept"        : "application/vnd.pagerduty+json;version=2",
                    "Authorization" : "Token token=" + this.oPagerDutySystem.u_meta_value,
                    "Content-Type"  : "application/json"
                },
                "Method"    : "get",
                "MidServer" : null,
                "Payload"   : null,
                "Sleep"     : 5000,
                "Timeout"   : 120000
            };
            var oOncall = this.libs.ppbPostRESTSync(oInput);
            if ( oOncall.ResponseCode == 200 ) {
                var json = JSON.parse(oOncall.ResponseBody);
                this.libs.ppbPutRecord({"Table":"u_system_access","SysId":this.oPagerDutySystem.u_system.sys_id.toString(),"Column":"u_access_data","Value":json.total});
            }
        }
    },

    /**********************************************************************************************
     * Query Slack for a specific email address
     **********************************************************************************************/
    checkSlackUser : function(inEmailAddress) {
        var output = {
            "emails"   : "",
            "groups"   : 0,
            "id"       : "error",
            "userName" : ""
        };
        var sEndpoint = encodeURI("https://api.slack.com/scim/v1/Users?filter=email eq " + inEmailAddress);
        var jInput = {
            "ApiRetry"  : 3,
            "ApiSleep"  : 5000,
            "Endpoint"  : sEndpoint,
            "Headers"   : {
                "Accept"        : "application/json",
                "Authorization" : "Bearer " + this._getSlackSCIMToken(),
                "Content-Type"  : "application/json"
            },
            "Method"    : "get",
            "MidServer" : null,
            "Payload"   : null,
            "Timeout"   : 120000,
        };
        var jResult = this.libs.ppbPostRESTSync(jInput);
        if ( jResult.ResponseCode === 200 ) {
            var json = JSON.parse(jResult.ResponseBody);
            for ( var i = 0; i < json.Resources.length; i++ ) {
                output.emails   = json.Resources[i].emails[0].value;
                output.groups   = json.Resources[i].groups.length;
                output.id       = json.Resources[i].id;
                output.userName = json.Resources[i].userName;
            }
        }
        return output;
    },

    /**********************************************************************************************
     * Create a new user in Slack
     **********************************************************************************************/
    postSlackUser : function(inUser) {
        var output = {
            "SystemAccessId"     : "",
            "SystemAccessResult" : "",
            "email"              : "",
            "groups"             : "",
            "id"                 : "error",
            "userName"           : ""
        };
        var sEmail        = inUser.email.toString();
        var sUsername     = inUser.user_name.toString().toLowerCase();
        var sFirstName    = inUser.first_name.toString();
        var sLastName     = inUser.last_name.toString();
        var sTitle        = inUser.title.toString();
        var sPhone        = JSUtil.notNil(inUser.phone) ? inUser.phone : null;
        var sUserProfile  = 'https://' + gs.getProperty('instance_name') + '.service-now.com/nav_to.do?uri=sys_user.do?sys_id=' + inUser.sys_id.toString() + '%26sysparm_view=ess';
        var sUserType     = JSUtil.notNil(inUser.u_contract_type) ? inUser.u_contract_type : 'Permanent';
        var sTimeZone     = JSUtil.notNil(inUser.time_zone.getDisplayValue()) ? inUser.time_zone.getDisplayValue() : null;
        var nEmpNumber    = JSUtil.notNil(inUser.employee_number.toString()) ? inUser.employee_number.toString() : 0;
        var sCostCent     = JSUtil.notNil(inUser.cost_center.getDisplayValue()) ? inUser.cost_center.getDisplayValue() : null;
        var sOrganization = null;
        var sBusUnit      = JSUtil.notNil(inUser.u_business_unit.getDisplayValue()) ? inUser.u_business_unit.getDisplayValue() : null;
        var sDepartment   = JSUtil.notNil(inUser.department.getDisplayValue()) ? inUser.department.getDisplayValue() : null;
        var oManager      = this._getSlackUser(inUser.manager.sys_id.toString());
        var sManagerId    = JSUtil.notNil(oManager.u_user_reference.toString()) ? oManager.u_user_reference.toString() : null;
        if ( JSUtil.notNil(sEmail) ) {
            var aEmail = sEmail.split('@');
            sUsername = aEmail[0].toString().toLowerCase();
        }
        var json = {
            "schemas" : ["urn:scim:schemas:core:1.0","urn:scim:schemas:extension:enterprise:1.0"],
            "active"            : true,
            "displayName"       : sFirstName + " " + sLastName,
            "locale"            : null,
            "nickName"          : sUsername,
            "preferredLanguage" : null,
            "profileUrl"        : sUserProfile,
            "timezone"          : sTimeZone,
            "title"             : sTitle,
            "userName"          : sUsername,
            "userType"          : sUserType,
            "name" : {
                "familyName"      : sLastName,
                "givenName"       : sFirstName,
                "honorificPrefix" : ""
            },
            "emails" : [
                {
                    "primary" : true,
                    "type"    : "work",
                    "value"   : sEmail.toLowerCase()
                }
            ],
            "phoneNumbers" : [
                {
                    "primary" : "true",
                    "type"    : "work",
                    "value"   : sPhone
                }
            ],
            "roles" : [
                {
                    "primary" : "true",
                    "type"    : "work",
                    "value"   : sTitle
                }
            ],
            "urn:scim:schemas:extension:enterprise:1.0" : {
                "costCenter"     : sCostCent,
                "department"     : sDepartment,
                "division"       : sBusUnit,
                "employeeNumber" : nEmpNumber,
                "organization"   : sOrganization,
                "manager" : {
                    "managerId":sManagerId
                }
            }
        };
        var sEndpoint = encodeURI("https://api.slack.com/scim/v1/Users");
        var jInput = {
            "ApiRetry"  : 3,
            "ApiSleep"  : 5000,
            "Endpoint"  : sEndpoint,
            "Headers"   : {
                "Accept"        : "application/json",
                "Authorization" : "Bearer " + this._getSlackSCIMToken(),
                "Content-Type"  : "application/json"
            },
            "Method"    : "post",
            "MidServer" : null,
            "Payload"   : JSON.stringify(json),
            "Timeout"   : 120000
        };
        var jResult = this.libs.ppbPostRESTSync(jInput);
        if ( jResult.ResponseCode === 201 ) {
            json = JSON.parse(jResult.ResponseBody);
            output.email    = json.emails[0].value.toString();
            output.groups   = json.groups.length;
            output.id       = json.id.toString();
            output.userName = json.userName.toString();
            var sQuery = 'u_active=true^u_system=' + this.oSlackSystem.sys_id.toString() + '^u_user_reference=' + output.id;
            var jSystemInput = {
                "AccessData"      : output.groups,
                "Active"          : true,
                "Comment"         : "",
                "Commissioned"    : new GlideDateTime(),
                "CommissionedBy"  : "",
                "Decomissioned"   : "",
                "DecomissionedBy" : "",
                "Expires"         : "",
                "Query"           : sQuery,
                "System"          : this.oSlackSystem.sys_id.toString(),
                "User"            : inUser.sys_id.toString(),
                "UserRef"         : output.id,
                "UserSysRef"      : output.userName + ' : ' + output.email
            };
            var oSystemAccess = this._postSystemAccess(jSystemInput);
            output.SystemAccessId     = oSystemAccess.sys_id.toString();
            output.SystemAccessResult = oSystemAccess.result.toString();
        }
        return output;
    },

    /**********************************************************************************************
     * Invite a specific user to a specific Slack channel
     **********************************************************************************************/
    postSlackChannelInvite : function(inChannelId, inUserId) {
        var output = 'error';
        var sEndpoint = encodeURI('https://slack.com/api/channels.invite?token=' + this.oSlackSystem.u_access_token + '&channel=' + inChannelId + '&user=' + inUserId + '&pretty=1');
        var jInput = {
            "ApiRetry"  : 3,
            "ApiSleep"  : 5000,
            "Endpoint"  : sEndpoint,
            "Headers"   : {
                "Accept"       : "application/json",
                "Content-Type" : "application/json"
            },
            "Method"    : "post",
            "MidServer" : null,
            "Payload"   : null,
            "Timeout"   : 120000
        };
        var jResult = this.libs.ppbPostRESTSync(jInput);
        if ( jResult.ResponseCode == 200 ) {
            var json = JSON.parse(jResult.ResponseBody);
            if ( json.ok == true ) {
                output = 'success';
            }
        }
        return output;
    },

    /**********************************************************************************************
     * Kick a specific user from a specific channel
     **********************************************************************************************/
    postSlackChannelKick : function(inChannelId, inUserId) {
        var output = 'error';
        var sEndpoint = encodeURI('https://slack.com/api/channels.kick?token=' + this.oSlackSystem.u_access_token + '&channel=' + inChannelId + '&user=' + inUserId + '&pretty=1');
        var jInput = {
            "ApiRetry"  : 3,
            "ApiSleep"  : 5000,
            "Endpoint"  : sEndpoint,
            "Headers"   : {
                "Accept"       : "application/json",
                "Content-Type" : "application/json"
            },
            "Method"    : "post",
            "MidServer" : null,
            "Payload"   : null,
            "Timeout"   : 120000
        };
        var jResult = this.libs.ppbPostRESTSync(jInput);
        if ( jResult.ResponseCode == 200 ) {
            var json = JSON.parse(jResult.ResponseBody);
            if ( json.ok == true ) {
                output = 'success';
            }
        }
        return output;
    },

    /**********************************************************************************************
     * Disable all affected record in a table
     **********************************************************************************************/
    _disableRecords : function(inTable, inQuery) {
        var glider = new GlideRecord(inTable);
        glider.addEncodedQuery(inQuery);
        glider.query();
        while ( glider.next() ) {
            glider.u_active = false;
            glider.update();
        }
    },

    /**********************************************************************************************
     * Query system access table for a user
     **********************************************************************************************/
    _getSlackUser : function(inUserId) {
        var output;
        var glider = new GlideRecord('u_system_access');
        glider.addEncodedQuery('u_active=true^u_system=' + this.oPagerDutySystem.u_system.u_default_user.sys_id.toString() + '^u_user=' + inUserId);
        glider.query();
        while ( glider.next() ) {
            output = glider;
        }
        return output;
    },

    /**********************************************************************************************
     *
     **********************************************************************************************/
    _getSlackSystem : function(inSystemId) {
        var oSystem = {
            "sys_id" : "error"
        };
        var oInput = {
            "Table" : "u_system",
            "Query" : "sys_id=" + inSystemId
        };
        oSystem = this.libs.ppbGetRecord(oInput);
        return oSystem;
    },

    /**********************************************************************************************
     *
     **********************************************************************************************/
    _getPagerDutySystem : function(inSystemId) {
        var oSystem = {
            "sys_id" : "error"
        };
        var oInput = {
            "Table" : "u_system_meta",
            "Query" : "u_active=true^u_system=" + inSystemId + "^u_meta_key=Slack User Automation"
        };
        oSystem = this.libs.ppbGetRecord(oInput);
        return oSystem;
    },

    /**********************************************************************************************
     *
     **********************************************************************************************/
    _getSlackGroupChannelId : function() {
        var oSystem = {
            "sys_id" : "error"
        };
        var oInput = {
            "Table" : "u_system_meta",
            "Query" : "u_active=true^u_system=" + gs.getProperty('ppb.automation.pagerduty.oncall_export.PagerDutySystemId', '78c5672c37a95600a15e19a543990e13') + "^u_meta_key=Slack Group Channel"
        };
        oSystem = this.libs.ppbGetRecord(oInput);
        return oSystem.u_meta_value.toString();
    },

    /**********************************************************************************************
     *
     **********************************************************************************************/
    _getSlackSCIMToken : function() {
        var oSystem = {
            "sys_id" : "error"
        };
        var oInput = {
            "Table" : "u_system_meta",
            "Query" : "u_active=true^u_system=" + this.oSlackSystem.sys_id.toString() + "^u_meta_key=Slack SCIM Token"
        };
        oSystem = this.libs.ppbGetRecord(oInput);
        return oSystem.u_meta_value.toString();
    },

    /**********************************************************************************************
     * List all members of the PagerDuty Slack channel
     **********************************************************************************************/
    _getChannelMembers : function() {
        var output = 'error';
        var sEndpoint = encodeURI("https://slack.com/api/channels.info?token=" + this.oSlackSystem.u_access_token + "&channel=" + this._getSlackGroupChannelId() + "&pretty=1");
        var jInput = {
            "ApiRetry"  : 3,
            "ApiSleep"  : 5000,
            "Endpoint"  : sEndpoint,
            "Headers"   : {
                "Accept"       : "application/json",
                "Content-Type" : "application/json"
            },
            "Method"    : "get",
            "MidServer" : null,
            "Payload"   : null,
            "Timeout"   : 120000
        };
        var jResult = this.libs.ppbPostRESTSync(jInput);
        if ( jResult.ResponseCode === 200 ) {
            var json = JSON.parse(jResult.ResponseBody);
            if ( json.ok == true ) {
                output = JSON.stringify(json.channel.members.toString());
            }
        }
        return output;
    },

    /**********************************************************************************************
     *
     **********************************************************************************************/
    _postSystemAccess : function(inObject) {
        var output = {
            "result" : "error",
            "sys_id" : ""
        };
        var glider = new GlideRecord('u_system_access');
        glider.addEncodedQuery(inObject.Query);
        glider.query();
        if ( glider.hasNext() ) {
            while ( glider.next() ) {
                output.sys_id = glider.sys_id;
                output.result = 'updated';
                if ( JSUtil.notNil(inObject.AccessData)      ) { glider.u_access_data        = inObject.AccessData;      }
                if ( JSUtil.notNil(inObject.Active)          ) { glider.u_active             = inObject.Active;          }
                if ( JSUtil.notNil(inObject.Comment)         ) { glider.u_comment            = inObject.Comment;         }
                if ( JSUtil.notNil(inObject.Commissioned)    ) { glider.u_commissioned       = inObject.Commissioned;    }
                if ( JSUtil.notNil(inObject.CommissionedBy)  ) { glider.u_commissioned_by    = inObject.CommissionedBy;  }
                if ( JSUtil.notNil(inObject.Decomissioned)   ) { glider.u_decommissioned     = inObject.Decomissioned;   }
                if ( JSUtil.notNil(inObject.DecomissionedBy) ) { glider.u_decommissioned_by  = inObject.DecomissionedBy; }
                if ( JSUtil.notNil(inObject.Expires)         ) { glider.u_expires            = inObject.Expires;         }
                if ( JSUtil.notNil(inObject.System)          ) { glider.u_system             = inObject.System;          }
                if ( JSUtil.notNil(inObject.User)            ) { glider.u_user               = inObject.User;            }
                if ( JSUtil.notNil(inObject.UserRef)         ) { glider.u_user_reference     = inObject.UserRef;         }
                if ( JSUtil.notNil(inObject.UserSysRef)      ) { glider.u_user_sys_reference = inObject.UserSysRef;      }
                glider.update();
            }
        } else {
            glider.initialize();
            glider.u_active             = inObject.Active;
            glider.u_commissioned       = inObject.Commissioned;
            glider.u_commissioned_by    = inObject.CommissionedBy;
            glider.u_system             = inObject.System;
            glider.u_user               = inObject.User;
            glider.u_user_reference     = inObject.UserRef;
            glider.u_user_sys_reference = inObject.UserSysRef;
            if ( JSUtil.notNil(inObject.AccessData)      ) { glider.u_access_data       = inObject.AccessData;      }
            if ( JSUtil.notNil(inObject.Comment)         ) { glider.u_comment           = inObject.Comment;         }
            if ( JSUtil.notNil(inObject.Decomissioned)   ) { glider.u_decommissioned    = inObject.Decomissioned;   }
            if ( JSUtil.notNil(inObject.DecomissionedBy) ) { glider.u_decommissioned_by = inObject.DecomissionedBy; }
            if ( JSUtil.notNil(inObject.Expires)         ) { glider.u_expires           = inObject.Expires;         }
            output.sys_id = glider.insert();
            output.result = 'inserted';
        }
        return output;
    },

    type: 'PagerDutySlackLink'
};
