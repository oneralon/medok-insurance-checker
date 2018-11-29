const ORGANIZATION = 'МБУЗ "ГП №2"';

const patientPage = /medok\.ruswizards\.com\/Default\.aspx\?personId=/i;
const schedulePage = /medok\.ruswizards\.com\/Schedule\/Default\.aspx\?patientId\=/i;

async function main() {
  if (patientPage.test(window.location.href)) {
    const patient = parsePatient();
    if (!localStorage.getItem(`patient-${patient.id}`)) {
      localStorage.setItem(`patient-${patient.id}`, JSON.stringify(patient));
    }
  }

  if (schedulePage.test(window.location.href)) {
    const id = window.location.href.split('?')[1].split('&')[0].split('=')[1];
    const data = localStorage.getItem(`patient-${id}`);
    if (data) {
      const patient: Patient = JSON.parse(data);
        let answer: Answer = await rostovtfoms(patient);
        // if (answer.noData) {
        //   answer = await tfoms(patient);
        // }
        patient.answer = answer;
        localStorage.setItem(`patient-${patient.id}`, JSON.stringify(patient));
      if (!patient.answer.attached) {
        let message = 'Пациент прикреплен к другой поликлинике';
        if (patient.answer.organization) {
          message += `: ${patient.answer.organization}`;
        }
        if (patient.answer.from) {
          message += ` c ${patient.answer.from}`;
        }
        ($ as any).toast({
          heading: 'Внимание!',
          text: message,
          hideAfter: false,
          position: 'top-left',
          icon: 'error'
        });
      } else {
        ($ as any).toast({
          heading: 'Информация',
          text: 'Пациент прикреплен к поликлинике',
          hideAfter: 5000,
          position: 'top-left',
          icon: 'success'
        });
      }
      if (patient.answer.noData) {
        ($ as any).toast({
          heading: 'Информация',
          text: 'Данные о прикреплении пациента не найдены',
          hideAfter: 5000,
          position: 'top-left',
          icon: 'info'
        });
      }
    }
  }
}

main();

async function rostovtfoms(patient: Patient): Promise<Answer> {
  const url = 'http://rostov-tfoms.ru/polis/pol_check.php';
  const { last, first, middle, dob, snn, passportSer, passportNum } = patient;
  const body = `seria=&npoli=&viddk=14&serdk=${passportSer}&nomdk=${passportNum}` +
    `&snils=${snn}&famip=${last}&namep=${first}&otchp=${middle}&drogd=${dob}&check_bot=1`;
  const res = await $.post(url, body.replace(/Нет\sданных/g, ''));
  if (/Вы застрахованы в страховой компании/.test(res)) {
    const organization = ($($.parseHTML(res)).find('td').eq(1).text() || '').replace(/\\/g, '').trim();
    const from = $($.parseHTML(res)).find('td').eq(3).text().trim().replace(/\\/g, '');
    const attached = organization === ORGANIZATION;
    return { attached, from, organization };
  }
  return { attached: false, noData: true };
}

async function tfoms(patient: Patient): Promise<Answer> {
  return { attached: false, noData: true };
}

class Patient {
  public id: string;
  public first: string;
  public middle: string;
  public last: string;
  public dob: string;
  public snn: string;
  public passportSer: string;
  public passportNum: string;
  public answer?: Answer;
}

function parsePatient(): Patient {
  const id = $('html').text().match(/\'dxppkPatient\'\:\'([a-z0-9\-]+)\'/)[1];
  const title = $('.patient_name > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(1) > div:nth-child(1)').text() || '';
  const [last, first, middle] = title.split(/\s/);
  const dob = ($('.patient_general_info > tbody:nth-child(1) > tr:nth-child(2) > td:nth-child(2)').text().trim() || '').replace('Нет данных', '');
  const snn = ($('td.bottom_row:nth-child(6)').text().trim() || '').replace('Нет данных', '');
  const passportPath = 'td.round_panel_content:nth-child(6) > table:nth-child(2) > tbody:nth-child(1)';
  const passportSer = ($(`${passportPath} > tr:nth-child(2) > td:nth-child(2)`).text().trim() || '').replace(' ', '').replace('Нет данных', '');
  const passportNum = ($(`${passportPath} > tr:nth-child(2) > td:nth-child(3)`).text().trim() || '').replace(' ', '').replace('Нет данных', '');
  return { id, last, first, middle, dob, snn, passportSer, passportNum };
}

class Answer {
  public readonly attached: boolean;
  public readonly organization?: string;
  public readonly from?: string;
  public readonly noData?: boolean;
}
