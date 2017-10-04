var PPBLibrary = Class.create();
PPBLibrary.prototype = {
    initialize: function() {
        this.aDebug = [];
    },

//*************************************************************************************************
// inObject.Endpoint
// inObject.Payload
// inObject.Timeout
// inObject.MidServer
// inObject.Headers
// inObject.Parameters
// inObject.ApiRetry
// inObject.ApiSleep
// inObject.SOAPAction
// inObject.BasicAuth.Pswd
// inObject.BasicAuth.User
// inObject.MutualAuth
//*************************************************************************************************
    ppbPostSOAPSync : function(inObject) {
        var sFunctionName = 'ppbPostSOAPSync';
        this.aDebug.push('');
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Starting');
        var oResponse, nResponseCode = 500, sResponseBody = {}, sRequestBody = {}, sResponseEndpoint = '', sResponseHeaders = '', aResponseHeaders = [], sRequestHeaders = '', key;

        if ( JSUtil.nil(inObject.Timeout)  ) { inObject.Timeout  = 120000; }
        if ( JSUtil.nil(inObject.ApiSleep) ) { inObject.ApiSleep = 5000; }
        if ( JSUtil.nil(inObject.Headers)  ) { inObject.Headers  = {"Content-Type":"application/json","Accept":"application/json"}; }

        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Endpoint       : ' + inObject.Endpoint);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Payload        : ' + inObject.Payload);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Timeout        : ' + inObject.Timeout);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- MID Server     : ' + inObject.MidServer);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Headers        : ' + JSON.stringify(inObject.Headers));
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Parameters     : ' + JSON.stringify(inObject.Parameters));
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- API Retry      : ' + inObject.ApiRetry);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- API Sleep      : ' + inObject.ApiSleep);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- SOAP Action    : ' + inObject.SOAPAction);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- BasicAuth User : ' + inObject.BasicAuth.User);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- BasicAuth Pswd : ' + inObject.BasicAuth.Pswd);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- MutualAuth     : ' + inObject.MutualAuth);

        if ( JSUtil.notNil(inObject.Endpoint) ) {
            var soap = new sn_ws.SOAPMessageV2();
            soap.setSOAPAction(inObject.SOAPAction);
            soap.setHttpTimeout(inObject.Timeout);
            soap.setEccParameter('skip_sensor', true);
            soap.setEndpoint(inObject.Endpoint);
            soap.waitForResponse(inObject.Timeout);

            if ( JSUtil.notNil(inObject.BasicAuth.User) ) { soap.setBasicAuth(inObject.BasicAuth.User, inObject.BasicAuth.Pswd); }
            if ( JSUtil.notNil(inObject.MutualAuth) ) { soap.setMutualAuth(inObject.MutualAuth); }
            if ( JSUtil.notNil(inObject.Headers) ) { for ( key in inObject.Headers ) { soap.setRequestHeader(key, inObject.Headers[key]); } }
            if ( JSUtil.notNil(inObject.Parameters) ) { for ( key in inObject.Parameters ) { soap.setStringParameter(key, inObject.Parameters[key]); } }
            if ( JSUtil.notNil(inObject.Payload) ) { soap.setRequestBody(inObject.Payload); }
            if ( JSUtil.notNil(inObject.MidServer) ) { soap.setMIDServer(inObject.MidServer); }

            for ( var i = 1; i <= parseInt(inObject.ApiRetry); i++ ) {
                this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Running try ' + i + ' of ' + inObject.ApiRetry);
                try {
                    oResponse = soap.execute();
                    if ( JSUtil.notNil(inObject.MidServer) ) { soap.waitForResponse(60); }
                    nResponseCode     = oResponse.getStatusCode();
                    sResponseBody     = oResponse.haveError() ? oResponse.getErrorMessage() : oResponse.getBody();
                    aResponseHeaders  = oResponse.getHeaders();
                    sResponseEndpoint = oResponse.getEndpoint();
                    sRequestHeaders   = oResponse.getRequestHeaders();
                } catch( err ) {
                    this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Caught in catch : ' + err);
                    sResponseBody    = 'Error Code : ' + err.getErrorCode() + '\nMessage : ' + err.getMessage() + '\nError Message : ' + err.getErrorMessage();
                    aResponseHeaders = oResponse.getHeaders();
                }
                if ( parseInt(nResponseCode) > 0 ) { break; } else { gs.sleep(parseInt(inObject.ApiSleep)); }
            }
        }

        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> ResponseCode     : ' + nResponseCode);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> ResponseBody     : ' + sResponseBody);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> RequestBody      : ' + sRequestBody);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> ResponseEndpoint : ' + sResponseEndpoint);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> ResponseHeaders  : ' + sResponseHeaders);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> RequestHeaders   : ' + sRequestHeaders);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Stopping');

        return {"ResponseCode":nResponseCode,"ResponseBody":sResponseBody,"RequestBody":sRequestBody,"ResponseEndpoint":sResponseEndpoint,"ResponseHeaders":sResponseHeaders,"RequestHeaders":sRequestHeaders};
    },

//*************************************************************************************************
// ApiRetry  :
// ApiSleep  :
// Endpoint  :
// Headers   : {"Content-Type":"application/json","Accept":"application/json"}
// Method    : get | put | post | delete
// MidServer : Only required if running command from inside the network
// Payload   : JSON payload for the target when using post or put
// Timeout   :
//*************************************************************************************************
    ppbPostRESTSync : function(inObject) {
        var sFunctionName = 'ppbPostRESTSync';
        this.aDebug.push('');
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Starting');
        var oResponse, nResponseCode = 500, sResponseBody = {}, sRequestBody = {}, sResponseEndpoint = '', sResponseHeaders = '', aResponseHeaders = [], sRequestHeaders = '';

        if ( JSUtil.nil(inObject.Timeout)  ) { inObject.Timeout  = 120000; }
        if ( JSUtil.nil(inObject.ApiSleep) ) { inObject.ApiSleep = 5000; }
        if ( JSUtil.nil(inObject.Headers)  ) { inObject.Headers  = {"Content-Type":"application/json","Accept":"application/json"}; }

        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Endpoint   : ' + inObject.Endpoint);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Method     : ' + inObject.Method);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Payload    : ' + inObject.Payload);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Timeout    : ' + inObject.Timeout);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- MID Server : ' + inObject.MidServer);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Headers    : ' + JSON.stringify(inObject.Headers));
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- API Retry  : ' + inObject.ApiRetry);

        if ( JSUtil.notNil(inObject.Endpoint) ) {
            var rest = new sn_ws.RESTMessageV2();
            rest.setHttpMethod(inObject.Method);
            rest.setHttpTimeout(inObject.Timeout);
            rest.setEccParameter('skip_sensor', true);
            rest.setEndpoint(inObject.Endpoint);
            rest.waitForResponse(inObject.Timeout);

            if ( JSUtil.notNil(inObject.Headers) ) { for ( var key in inObject.Headers ) { rest.setRequestHeader(key, inObject.Headers[key]); } }
            if ( JSUtil.notNil(inObject.Payload) ) { rest.setRequestBody(inObject.Payload); }
            if ( JSUtil.notNil(inObject.MidServer) ) { rest.setMIDServer(inObject.MidServer); }

            for ( var i = 1; i <= parseInt(inObject.ApiRetry); i++ ) {
                this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Running try ' + i + ' of ' + inObject.ApiRetry);
                try {
                    oResponse = rest.execute();
                    if ( JSUtil.notNil(inObject.MidServer) ) { rest.waitForResponse(60); }
                    nResponseCode     = oResponse.getStatusCode();
                    sResponseBody     = oResponse.haveError() ? oResponse.getErrorMessage() : oResponse.getBody();
                    aResponseHeaders  = oResponse.getHeaders();
                    sResponseEndpoint = oResponse.getEndpoint();
                    sRequestHeaders   = oResponse.getRequestHeaders();
                } catch( err ) {
                    this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Caught in catch : ' + err);
                    sResponseBody    = 'Error Code : ' + err.getErrorCode() + '\nMessage : ' + err.getMessage() + '\nError Message : ' + err.getErrorMessage();
                    aResponseHeaders = oResponse.getHeaders();
                } finally {
                    sRequestBody = rest ? rest.getRequestBody():null;
                    for ( var j = 0; j < aResponseHeaders.length; j++ ) { sResponseHeaders += aResponseHeaders[j] + ''; }
                }
                if ( parseInt(nResponseCode) > 0 ) { break; } else { gs.sleep(parseInt(inObject.ApiSleep)); }
            }
        }

        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> ResponseCode     : ' + nResponseCode);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> ResponseBody     : ' + sResponseBody);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> RequestBody      : ' + sRequestBody);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> ResponseEndpoint : ' + sResponseEndpoint);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> ResponseHeaders  : ' + sResponseHeaders);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> RequestHeaders   : ' + sRequestHeaders);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Stopping');

        return {"ResponseCode":nResponseCode,"ResponseBody":sResponseBody,"RequestBody":sRequestBody,"ResponseEndpoint":sResponseEndpoint,"ResponseHeaders":sResponseHeaders,"RequestHeaders":sRequestHeaders};
    },

//*************************************************************************************************
// MIDServer : MID server to run this command against
// IPAddress : Simpler to use the default of 127.0.0.1
// Command   : Command to run on the server
// MaxWait   : Time limit to wait for a response
//*************************************************************************************************
    ppbPostPowerShell : function(inObject) {
        var sFunctionName = 'ppbPostPowerShell';

        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Starting');
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- MID Server : ' + inObject.MIDServer);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- IP Address : ' + inObject.IPAddress);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Command    : ' + inObject.Command);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Max Wait   : ' + inObject.MaxWait);

        var oResponse = {"Status":"","Output":""};

        var oPsProbe = new PowershellProbe(inObject.MIDServer, inObject.IPAddress);
        oPsProbe.setScript(inObject.Command);
        oPsProbe.setMaxWait(inObject.MaxWait);
        oResponse = oPsProbe.execute(true);
        if ( JSUtil.notNil(oResponse) ) {
            this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Response from probe');
            oResponse.Status = 'Success';
            oResponse.Response = oResponse.output;
        } else {
            this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : No response from probe');
            oResponse.Status = 'Error';
            oResponse.Response = 'No output data from command';
        }

        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> Status   : ' + oResponse.Status);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> Response : ' + oResponse.Response);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Stopping');

        return oResponse;
    },

//*************************************************************************************************
// Table : table name to query
// Query : query string to search
//*************************************************************************************************
    ppbGetRecord : function(inObject) {
        var sFunctionName = 'ppbGetRecord';
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Starting');
        var output = {};
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Table : ' + inObject.Table);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Query : ' + inObject.Query);
        var glider = new GlideRecord(inObject.Table);
        glider.addEncodedQuery(inObject.Query);
        glider.setLimit(1);
        glider.query();
        if ( glider.hasNext() ) {
            this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Match found');
            while ( glider.next() ) { output = glider; }
        } else {
            this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : No match found');
        }
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> Output : ' + output.sys_id);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Stopping');
        return output;
    },

//*************************************************************************************************
// Table  : table name to open
// SysId  : Sys ID of the record to open
// Values : Post multiple fields
// Column : Column that needs to be updated (could be extented in the future for more columns
// Value  : Value for Column
//*************************************************************************************************
    ppbPutRecord : function(inObject) {
        var sFunctionName = 'ppbPutRecord';
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Stopping');
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Table  : ' + inObject.Table);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Sys ID : ' + inObject.SysId);
        var glider = new GlideRecord(inObject.Table);
        glider.addQuery('sys_id', inObject.SysId);
        glider.query();
        while ( glider.next() ) {
            if ( JSUtil.notNil(inObject.Values) ) {
                for ( var i = 0; i < inObject.Values.length; i++ ) {
                    this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- [' + i + '] ' + inObject.Values[i].Column + ' : ' + inObject.Values[i].Value);
                    glider[inObject.Values[i].Column] = inObject.Values[i].Value;
                }
            } else {
                this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- ' + inObject.Column + ' : ' + inObject.Value);
                glider[inObject.Column] = inObject.Value;
            }
            glider.update();
        }
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Stopping');
    },

//*************************************************************************************************
// System          : Sys ID of the system we're working with
// User            : Sys ID of the user we're working with
// UserRef         : The ID for the remote system so we have a clear link
// UserSysRef      : Any secondary data that can be used to identify user in remote system
// Active          : Is this record active
// Commissioned    : When was this connection created
// CommissionedBy  : Which record justifies this creation
// Decomissioned   : When was this connection decomissioned
// DecomissionedBy : Which record justifies this decomission
// Expires         : When does this access expire?  A scheduled job runs on this date to auto remove
//                   an account if posible
// Comment         : General comments about this record
// AccessData      : "bucket" to hold any extra data if needed.  Can be stored as JSON if scripted
//                   access is required
// Query           : Encoded query string for this record.  Drives if a record is created or updated
//*************************************************************************************************
    ppbPostSystemAccess : function(inObject) {
        var sFunctionName = 'ppbPostSystemAccess';
        var output = { "result" : "error", "sys_id" : "" };

        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Starting');
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Input data');
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- System          : ' + inObject.System);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- User            : ' + inObject.User);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- UserRef         : ' + inObject.UserRef);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- UserSysRef      : ' + inObject.UserSysRef);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Active          : ' + inObject.Active);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Commissioned    : ' + inObject.Commissioned);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- CommissionedBy  : ' + inObject.CommissionedBy);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Decomissioned   : ' + inObject.Decomissioned);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- DecomissionedBy : ' + inObject.DecomissionedBy);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Expires         : ' + inObject.Expires);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Comment         : ' + inObject.Comment);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Access Data     : ' + inObject.AccessData);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : <-- Query           : ' + inObject.Query);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : - - - - - - - - - - - - - - - - - - - - - - - - - - -');

        var glider = new GlideRecord('u_system_access');
        glider.addEncodedQuery(inObject.Query);
        glider.query();
        if ( glider.hasNext() ) {
            this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Found a record to update');
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
            this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Creating a new record');

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
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : --> Output : ' + output);
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Stopping');

        return output;
    },

//*************************************************************************************************
// pretty simple function to create an incident when needed
// {
//     "Values":[
//         {"Label":"Channel","Column":"u_channel","Value":""},
//         {"Label":"Business Service","Column":"u_service_affected","Value":""},
//         {"Label":"Jurisdiction","Column":"u_jurisdiction","Value":""},
//         {"Label":"Impact","Column":"impact","Value":""},
//         {"Label":"Outage","Column":"u_incident_outage","Value":""},
//         {"Label":"Technical service","Column":"u_technical_service","Value":""},
//         {"Label":"Incident state","Column":"incident_state","Value":""},
//         {"Label":"Assignment group","Column":"assignment_group","Value":""},
//         {"Label":"Assigned to","Column":"assigned_to","Value":""},
//         {"Label":"Short description","Column":"short_description","Value":""},
//         {"Label":"Classification","Column":"u_classification","Value":""},
//         {"Label":"Environment","Column":"u_environment","Value":""},
//         {"Label":"Contact type","Column":"contact_type","Value":""},
//         {"Label":"Configuration item","Column":"cmdb_ci","Value":""},
//         {"Label":"Description","Column":"description","Value":""},
//         {"Label":"Caller","Column":"caller_id","Value":""},
//         {"Label":"Telephone","Column":"u_req_phone","Value":""},
//         {"Label":"Email","Column":"u_req_email","Value":""},
//         {"Label":"Desk","Column":"u_req_desk","Value":""},
//         {"Label":"Location","Column":"location","Value":""}
//     ]
// }
//*************************************************************************************************
    ppbCreateIncident : function(inObject) {
        var sFunctionName = 'ppbCreateIncident';
        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Starting');
        var output = '', sLabel, sColumn, sValue;

        var glider = new GlideRecord('incident');
        glider.initialize()
        for ( var i = 0; i < inObject.Values.length; i++ ) {
            sLabel  = inObject.Values[i].Label;
            sColumn = inObject.Values[i].Column;
            sValue  = inObject.Values[i].Value;

            this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : ' + sLabel + ' : ' + sColumn + ' : ' + sValue);
            glider[sColumn] = sValue;
        }
        output = glider.insert();

        this.aDebug.push('[' + new Date().getTime() + '][' + sFunctionName + '] : Stopping. Record created "' + output + '"');
        gs.print(this.aDebug.join('\n'));
        return output;
    },

//*************************************************************************************************
// Requires a glide object.
// reads data from the history to determine if a resubmit is required
//*************************************************************************************************
    ppbCheckResubmit : function(inRecord) {
        var sResult  = '';
        var aMessage = [];
        var aJournal = inRecord.work_notes.getJournalEntry(1).split('\n');
        if ( aJournal[1].trim() == 'RESUBMIT' ) {
            aMessage.push("Checking RESUBMIT request");
            var aRow = aJournal[0].split(' ');
            var aDate = aRow[0].split('-');
            var sDateThen = aDate[2] + '-' + aDate[1] + '-' + aDate[0] + ' ' + aRow[1];
            var dDateNow  = new GlideDateTime();
            var dDateThen = new GlideDateTime(sDateThen);
            if ( gs.dateDiff(dDateThen, dDateNow.getDisplayValue(), true) < 20 ) {
                aMessage.push("Processing RESUBMIT request");
                sResult = 'process';
            } else {
                aMessage.push("Ignore RESUBMIT since it's too old");
                sResult = 'ignore';
            }
        } else {
            aMessage.push("Not a RESUBMIT request");
            sResult = 'invalid';
        }
        return {"Result":sResult,"Message":aMessage.join('\n')};
    },

//*************************************************************************************************
// Generic logger since the BetfairUtils one doesn't work...
// inProperty : Propery to check is debug is active
// inSource   : Source to log messages against
// inString   : Message to log in syslog
//*************************************************************************************************
    ppbLogger : function(inProperty, inSource, inString) {
        var bDebug = gs.getProperty(inProperty + '.debug', 'false');
        var sDebug = gs.getProperty(inProperty + '.prefix', inSource);
        if ( bDebug == 'true' ) { gs.log(inString, sDebug); }
    },

//*************************************************************************************************
// make sure a string is safe for JSON
// inString : String to be cleaned for processing
//*************************************************************************************************
    ppbJsonEncoding : function(inString) {
        inString = inString.replace(/\"/g, '&#34;');
        inString = inString.replace(/\\/g, '&#92;');
        //inString = inString.replace(/\//g, '&#47;');
        //inString = inString.replace(/\b/g, '\\b'); // backspace | word boundary
        //inString = inString.replace(/\f/g, '\\f');
        //inString = inString.replace(/\n/g, '\\n');
        //inString = inString.replace(/\r/g, '\\r');
        //inString = inString.replace(/\t/g, '\\t');
        return inString;
    },

//*************************************************************************************************
// Command   :
// ProbeID   :
// ProbeName :
// FromSysID :
// MIDServer :
// ECCName   :
// ECCSource :
// MaxTime   :
// Debug     :
//*************************************************************************************************
    ppbCommandProbe : function(inObject) {
        var sFunctionName = 'ppbCommandProbe';
        var oPayload = this._buildMIDPayload(inObject.Command, inObject.ProbeID, inObject.ProbeName);
        var glider = new GlideRecord('ecc_queue');
        glider.initialize();
        glider.from_sys_id = inObject.FromSysID;
        glider.agent       = 'mid.server.' + inObject.MIDServer;
        glider.topic       = 'Command';
        glider.name        = inObject.ECCName;
        glider.source      = inObject.ECCSource;
        glider.queue       = 'output';
        glider.state       = 'ready';
        glider.payload     = oPayload;
        var sSysId = glider.insert();
        var oResponse = this._getMIDResponse(sSysId, inObject.MaxTime);
        return oResponse;
    },
    _buildMIDPayload : function(inCommand, inProbeId, inProbeName) { var elName, elProbeId, elProbeName, elDiscovery, elSensor; var xmldoc = new XMLDocument("<parameters/>"); elName   = xmldoc.createElement("parameter"); elSensor = xmldoc.createElement("parameter"); if ( JSUtil.notNil(inProbeId) ) { elProbeId   = xmldoc.createElement("parameter"); elProbeName = xmldoc.createElement("parameter"); elDiscovery = xmldoc.createElement("parameter"); } xmldoc.setCurrent(elName); xmldoc.setAttribute("name", "name"); xmldoc.setAttribute("value", inCommand); xmldoc.setCurrent(elSensor); xmldoc.setAttribute("name", "skip_sensor"); xmldoc.setAttribute("value", "true"); if ( JSUtil.notNil(inProbeId) ) { xmldoc.setCurrent(elProbeId); xmldoc.setAttribute("name", "probe"); xmldoc.setAttribute("value", inProbeId); xmldoc.setCurrent(elProbeName); xmldoc.setAttribute("name", "probe_name"); xmldoc.setAttribute("value", inProbeName); xmldoc.setCurrent(elDiscovery); xmldoc.setAttribute("name", "used_by_discovery"); xmldoc.setAttribute("value", "true"); } return xmldoc.toString(); },
    _getMIDResponse : function(inSysID, inMaxTime) { var nCounter = 0, bComplete = false, oOutput = {}; var glider = new GlideRecord('ecc_queue'); glider.addEncodedQuery('queue=input^response_to=' + inSysID); while ( ( nCounter < inMaxTime ) && ( bComplete == false ) ) { glider.query(); if ( glider.next() ) { bComplete = true; glider.state = 'processed'; glider.processed = new GlideDateTime(); glider.update(); } gs.sleep(1000); nCounter++; } var oPayload = this._getMIDECCPayload(glider); var xmldoc = new XMLDocument(oPayload); if ( bComplete == true ) { oOutput.output = '' + this._getXMLValue(xmldoc, '//results/result/stdout'); oOutput.error  = '' + this._getXMLValue(xmldoc, '//results/result/stderr'); } return oOutput; },
    _getMIDECCPayload : function(inEccRecord) { var payload; if ( inEccRecord.payload != '<see_attachment/>' ) { payload = inEccRecord.payload; } else { var sa = new GlideSysAttachment(); payload = sa.get(inEccRecord, 'payload'); } return payload; },
    _getXMLValue : function(inXMLDoc, inPath) { var output = inXMLDoc.getNodeText(inPath); return output; },
//*************************************************************************************************//

    type: 'PPBLibrary'
};
