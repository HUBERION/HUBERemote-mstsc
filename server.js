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
require('dotenv').config();

var express = require('express');
var http = require('http');

process.env.IP = process.env.IP || '127.0.0.1';
process.env.PORT = process.env.PORT || 9250;

var app = express();
app.use(express.static(__dirname + '/client'))
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/html/index.html');
});
app.get('/:id', function(req, res) {
	res.redirect(`/?sessionId=${req.params.id}`);
});
var server = http.createServer(app).listen(process.env.PORT);

require('./server/mstsc')(server);
