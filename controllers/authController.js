const User = require('../models/User')
const Role = require('../models/Role')
const Messages = require('../models/Messages')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator')
const { secretKey } = require("../config");
const { isRequired } = require('nodemon/lib/utils');


const generateAccessToken = (id, roles) => {
  const payload = { id, roles };
  return jwt.sign(payload, secretKey, { expiresIn: '24h' })
}


class authController {
  async registration(req, res) {

    try {
      const errors = validationResult(req);
      console.log(errors);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Ошибка при регистрации", errors })
      }
      const { username, password, firstName, secondName, sex, birthDate, country, selectedAvatar } = req.body;
      const candidate = await User.findOne({ username })
      if (candidate) {
        return res.status(400).json({ message: 'Name occupied, use another' })
      }
      const hashPassword = bcrypt.hashSync(password, 3);
      const userRole = await Role.findOne({ value: 'USER' })
      const user = new User({ username, password: hashPassword, firstName, secondName, sex, birthDate, country, selectedAvatar, roles: [userRole.value] })
      await user.save();
      const userInDb = await User.findOne({ username });
      const msgPattern = new Messages({ ownerId: userInDb._id.toHexString() })
      await msgPattern.save()
      return res.json({ message: 'Successfully registred! You will be redirected to auth page' })
    } catch (e) {
      console.log(e);
      return res.status(400).json({ message: 'registration failed', e: e })
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body
      const user = await User.findOne({ username })
      res.setHeader('content-type', 'application/json');

      if (!user) {
        return res.status(401).json({ err: `User "${username}" not found` })
      }
      const isValidPassword = bcrypt.compareSync(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ err: `Password incorrect` })
      }
      const token = generateAccessToken(user._id, user.roles);
      return res.json({
        token, message: 'Successfull!'
      })

    } catch (e) {
      console.log(e);
      return res.status(401).json({ message: 'login failed', e: e })
    }
  }

  async getUsers(req, res) {//send list of all users
    try {
      let users = await User.find();

      for (let i = 0; i < users.length; i++) {// current user on 0 place of array
        if (users[i]._id.toHexString() === req.userId) {
          let you = users[i];
          users.splice(i, 1);
          users.unshift(you);
          break;
        }
      }
      await res.json(users);
    } catch (e) {
      console.log(e);
      return res.status(400).json({ message: 'getUsers failed', e: e })
    }
  }
}

module.exports = new authController()