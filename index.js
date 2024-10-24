import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { createSetting,GAME_MASTER_VOTING_COMMAND,GAME_MASTER_NIGHT_MAFIA_COMMAND,GAME_MASTER_VOTING_ANNOUNCEMENT,votingResult, nightResult } from './settingPrompt.js';
import 'colors';

export function basicPrompt(userPrompt, options = {}, context = []) {
    const messages = [
        ...context,
        {
            role: 'user',
            content: userPrompt,
        },
    ];
    return axios({
        method: 'post',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        data: {
            model: 'gpt-4o-mini',
            temperature: 0,
            ...options,
            messages,
        },
    }).then((res) => {
        const choice = res.data.choices[0];
        if (choice.finish_reason === 'stop') {
            return choice.message;
        }
        throw new Error('No response from AI');
    });
}

export function getPrompt(thread = []) {
    return function (userPrompt, options = {}) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const promptMessage = {
            role: 'user',
            content: userPrompt,
        };

        return axios({
            method: 'post',
            url,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            data: {
                model: 'gpt-4o-mini',
                max_tokens: 500,
                temperature: 0,
                ...options,
                messages: [...thread, promptMessage],
            },
        }).then((res) => {
            const choice = res.data.choices[0];
            if (choice.finish_reason === 'stop') {
                thread.push(promptMessage);
                thread.push(choice.message);
                return choice.message;
            }
            throw new Error('No response from AI');
        });
    };
}

export function NPCPrompt(setting) {
    return function (userPrompt, options = {}, context = []) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const promptMessage = {
            role: 'user',
            content: userPrompt,
        };

        return axios({
            method: 'post',
            url,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            data: {
                model: 'gpt-4o-mini',
                max_tokens: 500,
                temperature: 0,
                ...options,
                messages: [{
                    role: 'system',
                    content: setting
                }, ...context, promptMessage],
            },
        }).then((res) => {
            const choice = res.data.choices[0];
            if (choice.finish_reason === 'stop') {
                context.push(promptMessage); // Correctly using context here
                context.push(choice.message);
                return choice.message;
            }
            throw new Error('No response from AI');
        });
    };
}

export async function extractPersonality(textPrompts) {
    const prompt = getPrompt([{
        role: 'system',
        content: "You are a psychiatrist." +
            " You will be given a description of a person and you will have to imagine what their confidence level is." +
            " A confidence level is the likelihood that a person will speak up during a conversation." +
            " A confidence level is between 1 to 10, with 1 being the lowest confidence, and 10 being the highest confidence." +
            " Your answer must consist only of the confidence number level",
    }]);
    return prompt(textPrompts);
}

const MafiaRole = {
    MAFIA: 'Mafia',
    DOCTOR: 'Doctor',
    DETECTIVE: 'Detective',
    VILLAGER: 'Villager'
};

const role_motivations = {
    [MafiaRole.MAFIA]: 'Seeks to control the town from the shadows, operating with cunning and secrecy. Their goal is to eliminate non-Mafia players while protecting their own. They must act covertly, executing their plans under the cover of night and misleading others during the day to conceal their true identity.',
    [MafiaRole.DOCTOR]: 'Dedicated to saving lives, the Doctor works to protect those in danger from Mafia attacks. Their main goal is to identify and eliminate the Mafia threat, using their night actions to safeguard potential targets. All non-Mafia players are allies in the quest for peace.',
    [MafiaRole.DETECTIVE]: 'With a keen eye for deceit, the Detective investigates players to uncover their true alignments. Their mission is to use this knowledge to guide the town in rooting out the Mafia menace, employing their night actions to gather crucial intelligence.',
    [MafiaRole.VILLAGER]: 'As a regular townsperson, the Villager lacks special actions but plays a critical role in discussions and votes to eliminate the Mafia threat. Vigilance and collaboration with fellow non-Mafia players are their main weapons in the quest for safety and order.'
};

class Player {
    constructor(name, role, personality, confidence) {
        this.name = name;
        this.role = role;
        this.alive = true;
        this.personality = personality;
        this.confidence = confidence;
    }

    speak(conversation) {
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality);
        const prompt = NPCPrompt(setting);
        return prompt(conversation);
    }

    vote(conversation){
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality); 
        const prompt = NPCPrompt(setting, {
            response_format: {type:'json_object',}
        });
        return prompt(conversation+"\n"+GAME_MASTER_VOTING_COMMAND);
    }

    kill(conversation){
        const setting = createSetting(this.name, this.confidence, this.role, role_motivations[this.role],
            this.getAllyRoles(), this.getEnemyRoles(), this.getKnownAllies(), this.getOtherPlayers(), "You are in a small rural town.", this.personality); 
        const prompt = NPCPrompt(setting, {
            response_format: {type:'json_object',}
        });
        return prompt(conversation+"\n"+GAME_MASTER_NIGHT_MAFIA_COMMAND);
    }

    getAllyRoles() {
        return this.role === MafiaRole.MAFIA ? [MafiaRole.MAFIA] : [MafiaRole.DOCTOR, MafiaRole.DETECTIVE, MafiaRole.VILLAGER];
    }

    getEnemyRoles() {
        return this.role === MafiaRole.MAFIA ? [MafiaRole.DOCTOR, MafiaRole.DETECTIVE, MafiaRole.VILLAGER] : [MafiaRole.MAFIA];
    }

    getKnownAllies() {
        const mafiaPlayers = players.filter(player => player.role === MafiaRole.MAFIA && player.name !== this.name && player.alive==true)
                                     .map(player => player.name);
        return this.role === MafiaRole.MAFIA ? "You have no known allies" : mafiaPlayers.join(', ');
    }

    getOtherPlayers() {
        const otherPlayers = players.filter(player => player.name !== this.name && player.alive==true)
                                     .map(player => player.name);
        return otherPlayers.join(', ');
    }
}

function assignRoles(arr) {
    const numToSelect = Math.floor(arr.length / 4);
    const indexes = Array.from(Array(arr.length).keys());
    for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes.slice(0, numToSelect);
}

let characters = "";
let players = [];
fs.readFile('Characters.txt', 'utf8', async (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    characters = data.split('\n');
    const mafiaRoleIndexes = assignRoles(characters);

    // Create players and await the extraction of personalities
    for (const [index, line] of characters.entries()) {
        const data = line.trim().split(';');
        let confidence = 0;

        // Wait for personality extraction
        confidence = await extractPersonality(data[1]).then(res => parseInt(res.content, 10)).catch(console.error);

        let role = MafiaRole.VILLAGER;
        if (mafiaRoleIndexes.includes(index)) role = MafiaRole.MAFIA;
        players.push(new Player(data[0], role, data[1], confidence));
    }
    randomStart();
});

let conversation="Game Master: The day starts and the town is notified from the government that there is a Mafia about to murder all of them. Day 1 discussion ensues. \n";
let lastChosenPlayerName="";

function choosePlayer(players, lastChosenPlayerName) {
  // Calculate the total confidence
  const filteredPlayers= players.filter(player=> player.name!=lastChosenPlayerName && player.alive);
  const totalConfidence = filteredPlayers.reduce((total, player) => total + player.confidence, 0);

  // Generate a random number between 0 and totalConfidence
  const randomValue = Math.random() * totalConfidence;

  let cumulativeConfidence = 0;

  // Select the player based on confidence
  for (const player of filteredPlayers) {
      cumulativeConfidence += player.confidence;
      if (randomValue < cumulativeConfidence) {
          return player; // Return the chosen player
      }
  }
}


async function start() {
    for (const player of players) {
        const response = await player.speak(conversation);
        // console.log(player.name);
        console.log(player.name.red);
        console.log(response.content);
        conversation+=player.name+": "+response.content;
    }
}

async function randomStart() {
    while(true){
    for(let i=0;i<5;i++){
      const player=choosePlayer(players,lastChosenPlayerName);
      lastChosenPlayerName=player.name;
      const response = await player.speak(conversation);
      // console.log(player.name);
      console.log(player.name.blue);
      console.log(response.content);
      conversation+=player.name+": "+response.content;
    }
    let pendingConversation=GAME_MASTER_VOTING_ANNOUNCEMENT;
    let arr=[];
    for (const player of players) {
      const response = await player.vote(conversation);
      // console.log(player.name);
      const JSONdata=toJSON(response.content);
    //   console.log(JSONdata);
      console.log(JSONdata.player_to_eliminate.red);
      console.log(JSONdata.reason.green);
      arr.push(JSONdata.player_to_eliminate);
      pendingConversation+="I vote for "+JSONdata.player_to_eliminate;
      pendingConversation+=JSONdata.reason;
      pendingConversation+="\n";
    }
    conversation+=pendingConversation;
    conversation+=votingResult(mostFrequentElement(arr));
    players.filter(player=>player.name==mostFrequentElement(arr))[0].alive=false;
    const mafiaPlayers=players.filter(player=>player.role==MafiaRole.MAFIA && player.alive==true);
    const response = await mafiaPlayers[0].kill();
    console.log(response.content);

    conversation+=nightResult(response.content);
    }
}

function mostFrequentElement(arr) {
    const count = {};
    let maxElement = null;
    let maxCount = 0;

    // Count occurrences of each element
    for (const element of arr) {
        count[element] = (count[element] || 0) + 1;

        // Check if this element is now the most frequent
        if (count[element] > maxCount) {
            maxCount = count[element];
            maxElement = element;
        }
    }

    return maxElement;
}

function playerSpeak(username, content){
  conversation+= username+": "+content;
}

function toJSON(content) {
    return JSON.parse(content);
}
