/*
 * Copyright (c) 2015 Sylvain Peyrefitte
 *
 * This file is part of mstsc.js.
 *
 * mstsc.js is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

//import { request, GraphQLClient } from 'graphql-request'
const { GraphQLClient, gql } = require('graphql-request');
const rdp = require('node-rdpjs');

/**
 * Create proxy between rdp layer and socket io
 * @param server {http(s).Server} http server
 */
module.exports = function (server) {
	var io = require('socket.io')(server);
	io.on('connection', function(client) {
		var rdpClient = null;
		client.on('infos', async function (infos) {
			if (rdpClient) {
				// clean older connection
				rdpClient.close();
			};
			
			try{
				const connParams = await getConnParamsFromApi(infos.sessionId);

				if(connParams){

					rdpClient = rdp.createClient({
						domain : infos.domain,
						userName : infos.username,
						password : infos.password,
						enablePerf : true,
						autoLogin : true,
						screen : infos.screen,
						locale : infos.locale,
						logLevel : process.argv[2] || 'INFO'
					}).on('connect', function () {
						client.emit('rdp-connect');
					}).on('bitmap', function(bitmap) {
						client.emit('rdp-bitmap', bitmap);
					}).on('close', function() {
						client.emit('rdp-close');
					}).on('error', function(err) {
						client.emit('rdp-error', err);
					}).connect(connParams.currentHUB, connParams.supporterPort);
				}
				else{
					client.emit('rdp-error', {code: 'SESSIONNOTFOUND'});
				}
			}
			catch(err){
				console.log(err);
			}
		}).on('mouse', function (x, y, button, isPressed) {
			if (!rdpClient)  return;

			rdpClient.sendPointerEvent(x, y, button, isPressed);
		}).on('wheel', function (x, y, step, isNegative, isHorizontal) {
			if (!rdpClient) {
				return;
			}
			rdpClient.sendWheelEvent(x, y, step, isNegative, isHorizontal);
		}).on('scancode', function (code, isPressed) {
			if (!rdpClient) return;

			rdpClient.sendKeyEventScancode(code, isPressed);
		}).on('unicode', function (code, isPressed) {
			if (!rdpClient) return;

			rdpClient.sendKeyEventUnicode(code, isPressed);
		}).on('disconnect', function() {
			if(!rdpClient) return;

			rdpClient.close();
		});
	});
}

async function getConnParamsFromApi(sessionId){
	try{
		const graphClient = new GraphQLClient(process.env.GRAPHQL_ENDPOINT, 
			{ 
				headers: () => ({ 'Authorization': `bearer ${process.env.GRAPHQL_API_TOKEN}`})
			}
		);

		const query = gql`
			query {
				sessions(filters:{sessionId:{eq: "${sessionId}"}}){
				data{
					attributes{
						supporterPort
						currentHUB
					}
				}
				}
			}
		  `

		const result = await graphClient.request(query)

		return result.sessions.data[0]?.attributes;
	}
	catch(err){
		console.log(err);
	}
}