
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

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
    return function (userPrompt, options = {},context=[]) {
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
          thread.push(promptMessage);
          thread.push(choice.message);
          return choice.message;
        }
        throw new Error('No response from AI');
      });
    };
}

export async function extractPersonality(textPrompts){
    const prompt = getPrompt([
      {
        role: 'system',
        content: "You are a psychaitrist." 
        +"You will be given a description of a person and you will have to imagine what their confidence level is."
        +"A confidence level is the likelihood that a person will speak during a conversation."
        +"A confidence level is between 1 to 10, with 1 being the lowest confidence, and 10 being the highest confidence."
        +"Your answer must consist only of the confidence number level",
      },
    ]);
    return prompt(textPrompts);
    // return textPrompts.map((textPrompt)=>prompt(textPrompt));
}


// You are 
// Personality엔 invisible details과 visible details 가 있음.
// Your companions are a 

function createSetting(textPrompts, index){
    
}

function createContext(conversation, index){

}

fs.readFile('Characters.txt', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const lines = data.split('\n');
    

    // Iterate over each line and call extractPersonality
    lines.forEach(line => {
        // Call your function with the current line
        extractPersonality(line.trim()).then((res)=>{
          console.log(line);
          console.log(res);
        }); // trim to remove extra whitespace
    });
  });