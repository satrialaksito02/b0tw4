const fs = require('fs');
const config = require('../config');

class AntispamService {
    constructor(violationsFilePath) {
        this.violationsFilePath = violationsFilePath;
        this.violations = this.loadViolations();
    }

    loadViolations() {
        try {
            const data = fs.readFileSync(this.violationsFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
             console.error("Error loading violations:", error);
            return {};
        }
    }

      saveViolations() {
        try{
            fs.writeFileSync(this.violationsFilePath, JSON.stringify(this.violations, null, 2));
        }
        catch(error){
          console.error("Error saving violations:", error)
        }
    }


    addViolation(groupId, senderId) {
        if (!this.violations[groupId]) {
            this.violations[groupId] = {};
        }
        if (!this.violations[groupId][senderId]) {
            this.violations[groupId][senderId] = 0;
        }
        this.violations[groupId][senderId]++;
        this.saveViolations();
        return this.violations[groupId][senderId];
    }
  
    resetViolation(groupId, senderId){
      if (this.violations[groupId] && this.violations[groupId][senderId]) {
            delete this.violations[groupId][senderId];
            this.saveViolations();
        }
    }

    getViolations(groupId, senderId) {
        return this.violations[groupId]?.[senderId] || 0;
    }
}

const antispamService = new AntispamService(config.violationsFilePath);
module.exports = antispamService;

